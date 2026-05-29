// --- GAS側のコード（シート名変更版） ---
function doGet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const getPerformersFromSheet = (sheetName) => {
        const perfSheet = ss.getSheetByName(sheetName);
        if (!perfSheet) return [];

        const perfData = perfSheet.getDataRange().getValues();
        const perfHeader = perfData.shift();

        // 判定に使用する列のインデックスを取得
        const skipIdx = perfHeader.indexOf("未応募フラグ");
        const nameIdx = perfHeader.indexOf("名前");

        return perfData
            .filter(row => {
                // 【条件1】未応募フラグにチェック(true)が入っている行は除外
                if (skipIdx !== -1 && row[skipIdx] === true) {
                    return false;
                }

                // 【条件2】名前が空、または空白のみの行を除外
                if (nameIdx !== -1) {
                    const nameValue = row[nameIdx];
                    // stringに変換してトリム（前後の空白削除）し、中身があるか判定
                    if (!nameValue || String(nameValue).trim() === "") {
                        return false;
                    }
                }

                return true; // 上記の条件に当てはまらない（有効な）データのみ残す
            })
            .map(row => {
                let obj = {};
                perfHeader.forEach((h, i) => {
                    if (h === "除外フラグ") obj.exclude = row[i];
                    else if (h === "名前") obj.name = row[i];
                    else if (h === "TwitterID") obj.twitterId = row[i];
                    else if (h === "出演回数") obj.joinCount = row[i];
                    else if (h === "落選回数") obj.loseCount = row[i];
                    else if (h === "最終当選回") obj.lastWin = row[i];
                    else if (h === "補欠当選回") obj.lastBackup = row[i];
                    else if (h === "最終出演回") obj.lastJoin = row[i];
                });
                return obj;
            });
    };

    // --- 1. アイドル情報の取得 ---
    const idolSheet = ss.getSheetByName("アイドル一覧"); // シート名は実際の名称に合わせてください
    const idolData = idolSheet.getDataRange().getValues();
    const idolHeader = idolData.shift();
    const idols = idolData.map(row => {
        let obj = {};
        idolHeader.forEach((h, i) => obj[h] = row[i]);
        return obj;
    });

    // --- 2. 演者情報（応募者情報）の取得 ---
    const performers = getPerformersFromSheet("応募者情報");
    const performersAnniv = getPerformersFromSheet("応募者情報_アニバ用");

    // --- 3. 抽選結果の取得 ---
    const lotteryHistorySheet = ss.getSheetByName("抽選履歴");
    const lotteryHistoryData = lotteryHistorySheet.getDataRange().getValues();
    const lotteryHistoryHeader = lotteryHistoryData.shift();
    const lotteryHistory = lotteryHistoryData.map(row => {
        let obj = {};
        lotteryHistoryHeader.forEach((h, i) => obj[h] = row[i]);
        return obj;
    });

    // まとめてJSONで返す
    const result = {
        idols: idols,
        performers: performers,
        performersAnniv: performersAnniv,
        lotteryHistory: lotteryHistory
    };

    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * データ更新・登録用 (POST)
 */
function doPost(e) {
    try {
        const params = JSON.parse(e.postData.contents);
        const action = params.action;
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const perfSheet = ss.getSheetByName("応募者情報");

        if (action === "registerPerformer") {
            // 応募者情報の登録
            const name = params.name;
            const twitterId = params.twitterId;

            const data = perfSheet.getDataRange().getValues();
            const header = data[0];
            const nIdx = header.indexOf("名前");
            const tIdx = header.indexOf("TwitterID");
            const uIdx = header.indexOf("未応募フラグ");

            let foundRow = -1;
            let firstEmptyRow = -1;

            for (let i = 1; i < data.length; i++) {
                const rowName = String(data[i][nIdx] || "").trim();
                const rowTwitter = String(data[i][tIdx] || "").replace('@', '').trim();

                if (rowName === name && rowTwitter === twitterId) {
                    foundRow = i + 1;
                    break;
                }

                if (firstEmptyRow === -1 && rowName === "") {
                    firstEmptyRow = i + 1;
                }
            }

            if (foundRow !== -1) {
                // 【重複データの場合】
                // 未応募フラグのみを false にし、出演回数などは既存データを維持する
                if (uIdx !== -1) {
                    perfSheet.getRange(foundRow, uIdx + 1).setValue(false);
                }
            } else {
                // 【新規データの場合】
                // 空行があればそこへ、なければ末尾へ
                const targetRow = (firstEmptyRow !== -1) ? firstEmptyRow : data.length + 1;

                const newRowValues = header.map(h => {
                    if (h === "名前") return name;
                    if (h === "TwitterID") return twitterId;
                    if (h === "未応募フラグ") return false;

                    // 指定された項目は初期値を 0 に設定
                    const zeroFields = ["出演回数", "落選回数", "最終当選回", "補欠当選回", "最終出演回"];
                    if (zeroFields.includes(h)) return 0;

                    return ""; // その他（除外フラグ等）は空
                });

                // 指定した行に書き込み（これにより空行だった場所も 0 で初期化されます）
                perfSheet.getRange(targetRow, 1, 1, newRowValues.length).setValues([newRowValues]);
            }
            return makeJsonResponse({ success: true });

        } else if (action === "saveLotteryResults") {
            // 抽選結果の登録
            const volNum = params.vol;
            const results = params.results;
            const historySheet = ss.getSheetByName("抽選履歴"); // シート名は運用に合わせて修正してください

            if (!historySheet) return makeJsonResponse({ success: false, message: "シートなし" });

            // 1. データの書き込みループ
            results.forEach((res) => {
                // 最新のB列（DJ名）の状態を確認し、空いている行を探す
                const lastRow = Math.max(historySheet.getLastRow(), 1);
                const bColumnData = historySheet.getRange(1, 2, lastRow, 1).getValues();

                let targetRow = -1;
                for (let i = 0; i < bColumnData.length; i++) {
                    // B列が空（または空白文字のみ）を「空き枠」とみなす
                    if (String(bColumnData[i][0] || "").trim() === "") {
                        targetRow = i + 1;
                        break;
                    }
                }

                // 2. 空き枠がなければ、新しい行に「枠」を作る（直前行の書式をコピー）
                if (targetRow === -1) {
                    targetRow = historySheet.getLastRow() + 1;

                    // 既存の行がある場合、その書式（罫線・他列の数式など）をコピーして枠を作る
                    if (targetRow > 1) {
                        const sourceRange = historySheet.getRange(targetRow - 1, 1, 1, historySheet.getLastColumn());
                        const targetRange = historySheet.getRange(targetRow, 1, 1, historySheet.getLastColumn());
                        sourceRange.copyTo(targetRange); // 書式や数式をコピー
                        historySheet.getRange(targetRow, 1, 1, 9).clearContent(); // A-I列の中身だけ消す
                    }
                }

                // 3. データの書き込み
                const rowData = [
                    targetRow - 1,         // A: No
                    volNum,                // B: Vol
                    res.performerName,     // C: DJ名
                    res.type,              // D: 区分
                    res.idolIds[0] || "",  // E: アイドル1
                    res.idolIds[1] || "",  // F: アイドル2
                    res.idolIds[2] || "",  // G: アイドル3
                    false,                 // H: 出演フラグ
                    false                  // I: 反映フラグ
                ];

                historySheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
            });

            return makeJsonResponse({ success: true });
        } else if (action === "saveAppearanceResults") {
            // 出演結果の登録
            const results = params.results;
            const historySheet = ss.getSheetByName("抽選履歴");
            const idolSheet = ss.getSheetByName("アイドル一覧");
            const perfSheet = ss.getSheetByName("応募者情報");

            if (!historySheet || !idolSheet || !perfSheet) {
                return makeJsonResponse({ success: false, message: "必要なシートが見つかりません" });
            }

            // 処理効率化のため各シートの最新データを取得
            const historyData = historySheet.getDataRange().getValues();
            const idolData = idolSheet.getDataRange().getValues();
            const perfData = perfSheet.getDataRange().getValues();

            // ==========================================
            // 1. 事前の一括更新（バッチ処理）
            // ==========================================

            // アイドル一覧：E列（lastWin）を一律 False に初期化
            if (idolSheet.getLastRow() > 1) {
                idolSheet.getRange(2, 5, idolSheet.getLastRow() - 1, 1).setValue(false);
            }

            // 応募者情報：A列（未応募フラグ）が False の人のみ、F列（落選回数）を +1
            for (let i = 1; i < perfData.length; i++) {
                if (perfData[i][0] === false) { // A列: 未応募フラグ(index 0)
                    const currentFailCount = Number(perfData[i][5] || 0); // F列: 落選回数(index 5)
                    perfSheet.getRange(i + 1, 6).setValue(currentFailCount + 1);
                }
            }

            // ==========================================
            // 2. 個別の出演結果反映（ループ処理）
            // ==========================================
            results.forEach((res) => {
                const performerId = res.performerId;      // A列: No
                const appearanceResult = res.appearanceResult;

                // --- 「抽選履歴」から該当行の情報を特定 ---
                let historyRowIdx = -1;
                for (let i = 1; i < historyData.length; i++) {
                    if (historyData[i][0] == performerId) {
                        historyRowIdx = i;
                        break;
                    }
                }
                if (historyRowIdx === -1) return;

                const vol = historyData[historyRowIdx][1];    // B列: Vol
                const djName = historyData[historyRowIdx][2]; // C列: DJ名
                const type = historyData[historyRowIdx][3];   // D列: 区分
                const idolIds = [
                    historyData[historyRowIdx][4], // E列: アイドル1
                    historyData[historyRowIdx][5], // F列: アイドル2
                    historyData[historyRowIdx][6]  // G列: アイドル3
                ];

                // --- 「アイドル一覧」の更新 ---
                if (appearanceResult === true) {
                    idolIds.forEach(id => {
                        if (!id) return;
                        for (let i = 1; i < idolData.length; i++) {
                            if (idolData[i][0] == id) { // A列: id
                                // E列: lastWin を True に
                                idolSheet.getRange(i + 1, 5).setValue(true);
                                // D列: winCount(index 3) を +1
                                const currentWinCount = Number(idolData[i][3] || 0);
                                idolSheet.getRange(i + 1, 4).setValue(currentWinCount + 1);

                                // メモリ上の値も更新（同一アイドルが複数箇所で当選していた場合の重複加算防止）
                                idolData[i][3] = currentWinCount + 1;
                                break;
                            }
                        }
                    });
                }

                // --- 「応募者情報」の更新 ---
                let perfRowIdx = -1;
                for (let i = 1; i < perfData.length; i++) {
                    if (perfData[i][2] == djName) { // C列: 名前(index 2)
                        perfRowIdx = i;
                        break;
                    }
                }

                if (perfRowIdx !== -1) {
                    const rowNum = perfRowIdx + 1;
                    if (appearanceResult === true) {
                        // 出演（True）の場合
                        perfSheet.getRange(rowNum, 1).setValue(true); // A列: 未応募フラグ
                        const currentJoinCount = Number(perfData[perfRowIdx][4] || 0); // E列: 出演回数
                        perfSheet.getRange(rowNum, 5).setValue(currentJoinCount + 1);
                        perfSheet.getRange(rowNum, 6).setValue(0);    // F列: 落選回数を 0 にリセット
                        perfSheet.getRange(rowNum, 7).setValue(0);    // G列: 最終当選回
                        perfSheet.getRange(rowNum, 8).setValue(0);    // H列: 補欠当選回
                        perfSheet.getRange(rowNum, 9).setValue(vol);  // I列: 最終出演回
                    } else {
                        // 不参加（False）の場合
                        if (type === "通常") {
                            perfSheet.getRange(rowNum, 7).setValue(vol); // G列: 最終当選回
                        } else if (type === "補欠") {
                            perfSheet.getRange(rowNum, 8).setValue(vol); // H列: 補欠当選回
                        }
                    }
                }

                // --- 「抽選履歴」の反映フラグ更新 ---
                historySheet.getRange(historyRowIdx + 1, 8).setValue(appearanceResult); // H列: 出演フラグ
                historySheet.getRange(historyRowIdx + 1, 9).setValue(true);             // I列: 反映フラグ
            });

            return makeJsonResponse({ success: true });
        }

        return makeJsonResponse({ success: false, message: "無効なアクションです" });

    } catch (err) {
        return makeJsonResponse({ success: false, message: err.toString() });
    }
}

// レスポンス用共通関数
function makeJsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}