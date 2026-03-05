import { useState, useEffect } from 'react'
import './App.css'

type TabKey = 'lottery' | 'lotteryIdol' | 'performer' | 'appearance' | 'settings'
const GAS_URL = "https://script.google.com/macros/s/AKfycbyhZ8PUsciHHMgff651G6tjlMjeZRfoo-yeIaq0e3jCdaZ_WSA52e2xcbUJqR50VXe6/exec"
const PRIORITY_LOSE_THRESHOLD = 3

type Idol = {
  id?: string
  name: string
  prev?: boolean
  done?: boolean
  brand?: string
  winCount?: number | string
  [key: string]: unknown
}

type Performer = {
  name: string
  twitterId?: string
  joinCount?: number | string
  loseCount?: number | string
  lastWin?: number | string
  lastBackup?: number | string
  lastJoin?: number | string
  exclude?: boolean | string
  priority?: boolean
  confirmed?: boolean
  [key: string]: unknown
}

type IdolLotteryResult = { name: string; id: string }[] | 'none'

function LotteryPage({ volCount, isSpecialEnabled, specialVolText, specialPerformerCount, selectedPureRegular, performers, lotteryTableData, setLotteryTableData, idols, setIdols, idolLotteryResults, setIdolLotteryResults }: { volCount: number; isSpecialEnabled: boolean; specialVolText: string; specialPerformerCount: number; selectedPureRegular: string; performers: Performer[]; lotteryTableData: string[]; setLotteryTableData: (data: string[]) => void; idols: Idol[]; setIdols: (idols: Idol[]) => void; idolLotteryResults: { [key: number]: IdolLotteryResult }; setIdolLotteryResults: (results: { [key: number]: IdolLotteryResult }) => void }) {
  const logoPath = `${import.meta.env.BASE_URL}etc/NewP_Parade_logo.png`
  const [showNoTargetDialog, setShowNoTargetDialog] = useState(false)
  const [showNoPriorityDialog, setShowNoPriorityDialog] = useState(false)
  const [showNoRegularDialog, setShowNoRegularDialog] = useState(false)
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false) // ボタン位置ごとの抽選結果

  const handleConfirmedWin = () => {
    // 確定ステータスを持つ演者名を取得
    const confirmedNames = performers
      .filter(p => p.confirmed === true)
      .map(p => p.name)

    // 現在のテーブルに既に表示されている名前を取得
    const displayedNames = new Set([selectedPureRegular, ...lotteryTableData].filter(n => n))

    // テーブルに表示されていない確定演者を追加
    const maxRows = isSpecialEnabled ? specialPerformerCount : 9
    const newTableData = [...lotteryTableData]
    let addedCount = 0

    for (let i = 0; i < confirmedNames.length && newTableData.length < maxRows; i++) {
      if (!displayedNames.has(confirmedNames[i])) {
        newTableData.push(confirmedNames[i])
        addedCount++
      }
    }

    if (addedCount === 0) {
      setShowNoTargetDialog(true)
      return
    }

    setLotteryTableData(newTableData)
  }

  const handleClearLottery = () => {
    setShowClearConfirmDialog(true)
  }

  const handleConfirmClear = () => {
    setLotteryTableData([])
    setIdolLotteryResults({})
    setShowClearConfirmDialog(false)
  }

  const handlePriorityWin = () => {
    // 優先ステータスを持つ演者名を取得
    const priorityNames = performers
      .filter(p => p.priority === true)
      .map(p => p.name)

    // 現在のテーブルに既に表示されている名前を取得
    const displayedNames = new Set([selectedPureRegular, ...lotteryTableData].filter(n => n))

    // テーブルに空きがあるかチェック
    const maxRows = isSpecialEnabled ? specialPerformerCount : 9
    if (lotteryTableData.length >= maxRows) {
      setShowNoPriorityDialog(true)
      return
    }

    // 表示されていない優先者を1人見つける
    let foundName = null
    for (const name of priorityNames) {
      if (!displayedNames.has(name)) {
        foundName = name
        break
      }
    }

    if (!foundName) {
      setShowNoPriorityDialog(true)
      return
    }

    // テーブルに追加
    setLotteryTableData([...lotteryTableData, foundName])
  }

  const handleRegularWin = () => {
    // 除外ステータスを持たない演者名を取得
    const regularNames = performers
      .filter(p => p.exclude !== true)
      .map(p => p.name)

    // 現在のテーブルに既に表示されている名前を取得
    const displayedNames = new Set([selectedPureRegular, ...lotteryTableData].filter(n => n))

    // テーブルに空きがあるかチェック
    const maxRows = isSpecialEnabled ? specialPerformerCount : 9
    if (lotteryTableData.length >= maxRows) {
      setShowNoRegularDialog(true)
      return
    }

    // 表示されていない対象者からランダムに1人選ぶ
    const availableNames = regularNames.filter(name => !displayedNames.has(name))
    
    if (availableNames.length === 0) {
      setShowNoRegularDialog(true)
      return
    }

    const randomIndex = Math.floor(Math.random() * availableNames.length)
    const selectedName = availableNames[randomIndex]

    // テーブルに追加
    setLotteryTableData([...lotteryTableData, selectedName])
  }

  const handleIdolLottery = (rowIndex: number) => {
    // 前回抽選がFalseで、抽選済みがFalseのアイドルを取得
    const availableIdols = idols.filter(idol => idol.prev !== true && idol.done !== true)

    if (availableIdols.length === 0) {
      setIdolLotteryResults({ ...idolLotteryResults, [rowIndex]: 'none' })
      return
    }

    // 最大3人をランダムに選ぶ
    const selectedCount = Math.min(3, availableIdols.length)
    const selectedIdols: Idol[] = []
    const usedIndices = new Set<number>()

    for (let i = 0; i < selectedCount; i++) {
      let randomIndex: number
      do {
        randomIndex = Math.floor(Math.random() * availableIdols.length)
      } while (usedIndices.has(randomIndex))

      usedIndices.add(randomIndex)
      selectedIdols.push(availableIdols[randomIndex])
    }

    // 選抜されたアイドルの抽選済みをtrueに設定
    const updatedIdols = idols.map(idol => {
      const isSelected = selectedIdols.some(selected => selected.id === idol.id)
      return isSelected ? { ...idol, done: true } : idol
    })
    setIdols(updatedIdols)

    // 名前とIDをペアで保存
    const result = selectedIdols.map(idol => ({ name: idol.name, id: idol.id || '' }))
    setIdolLotteryResults({ ...idolLotteryResults, [rowIndex]: result })
  }

  const renderIdolImages = (result: IdolLotteryResult) => {
    if (result === 'none') return <span>なし</span>
    
    if (Array.isArray(result)) {
      return (
        <>
          {result.map((idol, idx) => {
            const basePath = `${import.meta.env.BASE_URL}idol`
            const etcPath = `${import.meta.env.BASE_URL}etc`
            const thousand = Math.floor(Number(idol.id) / 1000) * 1000
            return (
              <span key={idx} style={{ marginRight: '10px', display: 'inline-block' }}>
                <span style={{ marginRight: '5px' }}>{idol.name}</span>
                <img
                  src={`${basePath}/${idol.id}.png`}
                  alt="idol"
                  style={{ height: '35px', verticalAlign: 'middle' }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.src = `${etcPath}/${thousand}.png`
                  }}
                />
                {idx < result.length - 1 && <span style={{ marginLeft: '10px', marginRight: '10px' }}> / </span>}
              </span>
            )
          })}
        </>
      )
    }
    return null
  }

  const renderLotteryTable = () => {
    if (isSpecialEnabled) {
      return (
        <div id="lottery-container">
          <table id="lottery-table" className="main-lottery">
            <tbody>
              {Array.from({ length: specialPerformerCount }).map((_, i) => {
                const name = i === 0 ? selectedPureRegular : lotteryTableData[i - 1] || ''
                const idolResult = idolLotteryResults[i]
                return (
                  <tr key={i} className="row-regular">
                    <td>{name}</td>
                    <td>{name ? (idolResult ? renderIdolImages(idolResult) : <button className="lottery-execution-btn" onClick={() => handleIdolLottery(i)}>アイドル抽選</button>) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    } else {
      return (
        <div id="lottery-container">
          <table id="lottery-table" className="main-lottery">
            <tbody>
              {Array.from({ length: 7 }).map((_, i) => {
                const name = i === 0 ? selectedPureRegular : lotteryTableData[i - 1] || ''
                const idolResult = idolLotteryResults[i]
                return (
                  <tr key={i} className={i === 0 ? 'row-semi-regular' : 'row-regular'}>
                    <td>{name}</td>
                    <td>{name ? (idolResult ? renderIdolImages(idolResult) : <button className="lottery-execution-btn" onClick={() => handleIdolLottery(i)}>アイドル抽選</button>) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <h4 style={{ marginTop: '10px', marginLeft: '12px', marginBottom: '0' }}>補欠枠</h4>

          <table id="lottery-table" className="backup-lottery">
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => {
                const name = lotteryTableData[6 + i] || ''
                const rowIndex = 7 + i // 補欠枠のインデックスは7以降
                const idolResult = idolLotteryResults[rowIndex]
                return (
                  <tr key={i} className="row-backup">
                    <td>{name}</td>
                    <td>{name ? (idolResult ? renderIdolImages(idolResult) : <button className="lottery-execution-btn" onClick={() => handleIdolLottery(rowIndex)}>アイドル抽選</button>) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }
  }

  return (
    <section className="tab-page">
      {showNoTargetDialog && (
        <div className="modal-overlay" onClick={() => setShowNoTargetDialog(false)}>
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>確認</h3>
            </div>
            <div className="modal-body">
              <p>残りの確定当選者は0人です</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={() => setShowNoTargetDialog(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
      {showNoPriorityDialog && (
        <div className="modal-overlay" onClick={() => setShowNoPriorityDialog(false)}>
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>確認</h3>
            </div>
            <div className="modal-body">
              <p>残りの優先抽選対象者は0人です</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={() => setShowNoPriorityDialog(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
      {showNoRegularDialog && (
        <div className="modal-overlay" onClick={() => setShowNoRegularDialog(false)}>
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>確認</h3>
            </div>
            <div className="modal-body">
              <p>抽選対象が存在しません</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={() => setShowNoRegularDialog(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
      {showClearConfirmDialog && (
        <div className="modal-overlay" onClick={() => setShowClearConfirmDialog(false)}>
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>確認</h3>
            </div>
            <div className="modal-body">
              <p>抽選結果をリセットしますか？</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowClearConfirmDialog(false)}>キャンセル</button>
              <button className="modal-btn modal-btn-danger" onClick={handleConfirmClear}>リセット</button>
            </div>
          </div>
        </div>
      )}
      <div className="lottery-top-section">
        <div className="image-block">
          <img className="logo-img" src={logoPath} alt="P Parade ロゴ" />
        </div>
        <div id="vol-text">
          {isSpecialEnabled ? (
            <span className="vol-count">{specialVolText}</span>
          ) : (
            <>
              <span className="vol-label">Vol.</span>
              <span className="vol-count">{volCount}</span>
            </>
          )}
        </div>
      </div>
      <div className="lottery-control-panel">
        <button id="btn-lot-confirmed" className="lot-btn" onClick={handleConfirmedWin}>確定当選</button>
        <button id="btn-lot-priority" className="lot-btn" onClick={handlePriorityWin}>優先抽選</button>
        <button id="btn-lot-regular" className="lot-btn" onClick={handleRegularWin}>通常抽選</button>
        <button id="clear-lottery" className="lot-btn" onClick={handleClearLottery}>結果リセット</button>
      </div>
      {renderLotteryTable()}
    </section>
  )
}

function LotteryIdolPage({ idols, setIdols }: { idols: Idol[]; setIdols: (idols: Idol[]) => void }) {
  const [prevFilter, setPrevFilter] = useState<'all' | 'on' | 'off'>('all')
  const [doneFilter, setDoneFilter] = useState<'all' | 'on' | 'off'>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'prev' | 'done' | 'name' | 'brand' | 'winCount' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const maxNameLength = idols.length > 0 ? Math.max(...idols.map((idol) => idol.name.length)) : 1
  const nameColumnWidth = `${maxNameLength * 10 + 20}px`

  // ユニークなブランドを取得
  const brands = Array.from(new Set(idols.map((idol) => (idol as { brand?: string }).brand).filter((b) => b)))

  const handlePrevChange = (idx: number) => {
    const updatedIdols = [...idols]
    updatedIdols[idx] = { ...updatedIdols[idx], prev: !updatedIdols[idx].prev }
    setIdols(updatedIdols)
  }

  const handleDoneChange = (idx: number) => {
    const updatedIdols = [...idols]
    updatedIdols[idx] = { ...updatedIdols[idx], done: !updatedIdols[idx].done }
    setIdols(updatedIdols)
  }

  const handleResetAllCheckboxes = () => {
    const updatedIdols = idols.map((idol) => ({
      ...idol,
      prev: false,
      done: false,
    }))
    setIdols(updatedIdols)
  }

  const handleResetOrder = () => {
    setSortKey(null)
    setSortOrder('asc')
  }

  const handleHeaderClick = (key: 'prev' | 'done' | 'name' | 'brand' | 'winCount') => {
    if (sortKey === key) {
      // 同じカラムをクリック：昇順→降順→デフォルト
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortKey(null)
        setSortOrder('asc')
      }
    } else {
      // 別のカラムをクリック：昇順でソート開始
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // フィルター適用
  let filteredIdols = idols.filter((idol) => {
    // 前回抽選フィルター
    if (prevFilter === 'on' && !idol.prev) return false
    if (prevFilter === 'off' && idol.prev) return false

    // 抽選済みフィルター
    if (doneFilter === 'on' && !idol.done) return false
    if (doneFilter === 'off' && idol.done) return false

    // ブランドフィルター
    if (brandFilter !== 'all' && (idol as { brand?: string }).brand !== brandFilter) return false

    return true
  })

  // ソート適用
  if (sortKey) {
    filteredIdols = [...filteredIdols].sort((a, b) => {
      let aValue: unknown
      let bValue: unknown

      if (sortKey === 'prev') {
        aValue = a.prev ? 1 : 0
        bValue = b.prev ? 1 : 0
      } else if (sortKey === 'done') {
        aValue = a.done ? 1 : 0
        bValue = b.done ? 1 : 0
      } else if (sortKey === 'name') {
        aValue = a.name || ''
        bValue = b.name || ''
      } else if (sortKey === 'brand') {
        aValue = (a as { brand?: string }).brand || ''
        bValue = (b as { brand?: string }).brand || ''
      } else if (sortKey === 'winCount') {
        aValue = Number(a.winCount) || 0
        bValue = Number(b.winCount) || 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue, 'ja') : bValue.localeCompare(aValue, 'ja')
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
      return 0
    })
  }

  return (
    <section className="tab-page other-tab-page">
      <h2>抽選アイドル管理</h2>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label>前回抽選:</label>
          <select value={prevFilter} onChange={(e) => setPrevFilter(e.target.value as 'all' | 'on' | 'off')}>
            <option value="all">すべて</option>
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label>抽選済:</label>
          <select value={doneFilter} onChange={(e) => setDoneFilter(e.target.value as 'all' | 'on' | 'off')}>
            <option value="all">すべて</option>
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label>ブランド:</label>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="all">すべて</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
      </div>
      <h4>一括操作</h4>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleResetAllCheckboxes} style={{ marginRight: '10px', padding: '8px 16px', cursor: 'pointer' }}>
          全チェック解除
        </button>
        <button onClick={handleResetOrder} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          ID順にリセット
        </button>
      </div>
      {filteredIdols && filteredIdols.length > 0 ? (
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '80px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderClick('prev')}
              >
                前回抽選
              </th>
              <th
                style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '80px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderClick('done')}
              >
                抽選済み
              </th>
              <th
                style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', width: nameColumnWidth, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderClick('name')}
              >
                名前
              </th>
              <th
                style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderClick('brand')}
              >
                ブランド
              </th>
              <th
                style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderClick('winCount')}
              >
                当選回数
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredIdols.map((idol, idx) => (
              <tr key={idol.id || idx}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={idol.prev || false}
                    onChange={() => {
                      const originalIdx = idols.findIndex((i) => i.id === idol.id)
                      handlePrevChange(originalIdx)
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={idol.done || false}
                    onChange={() => {
                      const originalIdx = idols.findIndex((i) => i.id === idol.id)
                      handleDoneChange(originalIdx)
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{idol.name}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{(idol as { brand?: string }).brand || ''}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>{idol.winCount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>フィルター条件に該当するデータはありません</p>
      )}
    </section>
  )
}

function PerformerPage({ selectedPureRegular, setSelectedPureRegular, performers, setPerformers }: { selectedPureRegular: string; setSelectedPureRegular: (val: string) => void; performers: Performer[]; setPerformers: (performers: Performer[]) => void }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const pureRegularOptions = ["colorfu√", "MitsubaProject", "わたげ改", "黒糖"]

  const maxNameLength = performers.length > 0 ? Math.max(...performers.map((performer) => performer.name.length)) : 1
  const nameColumnWidth = `${maxNameLength * 10 + 20}px`

  const getStatusBadges = (performer: Performer) => {
    const badges = []
    if (performer.exclude) badges.push(<span key="exclude" style={{ display: 'inline-block', backgroundColor: '#555555', color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '12px' }}>除外</span>)
    if (performer.priority) badges.push(<span key="priority" style={{ display: 'inline-block', backgroundColor: '#f2994a', color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '12px' }}>優先</span>)
    if (performer.confirmed) badges.push(<span key="confirmed" style={{ display: 'inline-block', backgroundColor: '#eb5757', color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '12px' }}>確定</span>)
    return badges.length > 0 ? badges : <span style={{ display: 'inline-block', backgroundColor: '#27ae60', color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '12px' }}>通常</span>
  }

  const getStatusValue = (performer: Performer): string => {
    if (performer.exclude) return 'exclude'
    if (performer.priority) return 'priority'
    if (performer.confirmed) return 'confirmed'
    return 'normal'
  }

  const handleStatusChange = (idx: number, statusValue: string) => {
    const updatedPerformers = [...performers]
    const performer = { ...updatedPerformers[idx] }

    performer.exclude = statusValue === 'exclude'
    performer.priority = statusValue === 'priority'
    performer.confirmed = statusValue === 'confirmed'

    updatedPerformers[idx] = performer as Performer
    setPerformers(updatedPerformers)
    setEditingIdx(null)
  }

  return (
    <section className="tab-page other-tab-page">
      <h2>演者管理</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>準レギュラー設定: </h3>
        <select value={selectedPureRegular} onChange={(e) => setSelectedPureRegular(e.target.value)}>
          <option value="">選択してください</option>
          {pureRegularOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <h3>演者一覧</h3>
      {performers && performers.length > 0 ? (
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>状態</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', width: nameColumnWidth }}>名前</th>
            </tr>
          </thead>
          <tbody>
            {performers.map((performer, idx) => (
              <tr key={idx} style={{ backgroundColor: performer.exclude ? '#f0f0f0' : 'inherit' }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }} onClick={() => setEditingIdx(idx)}>
                  {editingIdx === idx ? (
                    <select
                      value={getStatusValue(performer)}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                      onBlur={() => setEditingIdx(null)}
                      autoFocus
                      style={{ padding: '4px', minWidth: '100px' }}
                    >
                      <option value="normal">通常</option>
                      <option value="exclude">除外</option>
                      <option value="priority">優先</option>
                      <option value="confirmed">確定</option>
                    </select>
                  ) : (
                    getStatusBadges(performer)
                  )}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{performer.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>データはまだ読み込まれていません</p>
      )}
    </section>
  )
}

function AppearancePage() {
  return (
    <section className="tab-page other-tab-page">
      <h2>出演管理</h2>
    </section>
  )
}

function SettingsPage({ volCount, setVolCount, isSpecialEnabled, setIsSpecialEnabled, specialVolText, setSpecialVolText, specialPerformerCount, setSpecialPerformerCount, volume, setVolume, isMuted, setIsMuted }: { volCount: number; setVolCount: (val: number) => void; isSpecialEnabled: boolean; setIsSpecialEnabled: (val: boolean) => void; specialVolText: string; setSpecialVolText: (val: string) => void; specialPerformerCount: number; setSpecialPerformerCount: (val: number) => void; volume: number; setVolume: (val: number) => void; isMuted: boolean; setIsMuted: (val: boolean) => void }) {
  return (
    <section className="tab-page other-tab-page">
      <h2>通常回Vol管理</h2>
      <h3>現在のVol数</h3>
      <div>
        <input
          type="number"
          min="0"
          value={volCount}
          onChange={(e) => setVolCount(Number(e.target.value))}
        />
        回
      </div>

      <h2>特殊回管理</h2>
      <div className="special-enable-wrapper">
        <input
          id="special-enable-toggle"
          type="checkbox"
          checked={isSpecialEnabled}
          onChange={(e) => setIsSpecialEnabled(e.target.checked)}
          className="toggle-switch-input"
        />
        <label htmlFor="special-enable-toggle" className="toggle-switch-label" />
        <label htmlFor="special-enable-toggle" className="special-enable-label">
          特殊回を有効にする
        </label>
      </div>
      <h3>vol表示を置き換える文字列</h3>
      <div>
        <input
          type="text"
          value={specialVolText}
          onChange={(e) => setSpecialVolText(e.target.value)}
        />
      </div>
      <h3>特殊回の出演者数</h3>
      <div>
        <input
          type="number"
          min="0"
          value={specialPerformerCount}
          onChange={(e) => setSpecialPerformerCount(Number(e.target.value))}
        />
      </div>

      <h2>音量調節</h2>
      <div className="volume-control-wrapper">
        <span className="volume-icon">🔈</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="volume-slider"
        />
        <span className="volume-icon">🔊</span>
      </div>
      <div className="special-enable-wrapper">
        <input
          id="mute-toggle"
          type="checkbox"
          checked={isMuted}
          onChange={(e) => setIsMuted(e.target.checked)}
          className="toggle-switch-input"
        />
        <label htmlFor="mute-toggle" className="toggle-switch-label" />
        <label htmlFor="mute-toggle" className="special-enable-label">
          ミュート
        </label>
      </div>
    </section>
  )
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'lottery', label: '抽選' },
  { key: 'lotteryIdol', label: '抽選アイドル管理' },
  { key: 'performer', label: '演者管理' },
  { key: 'appearance', label: '出演管理' },
  { key: 'settings', label: '設定' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('lottery')
  const [volCount, setVolCount] = useState(() => {
    const saved = localStorage.getItem('volCount')
    return saved ? Number(saved) : 0
  })
  const [isSpecialEnabled, setIsSpecialEnabled] = useState(() => {
    const saved = localStorage.getItem('isSpecialEnabled')
    return saved ? JSON.parse(saved) : false
  })
  const [specialVolText, setSpecialVolText] = useState(() => {
    const saved = localStorage.getItem('specialVolText')
    return saved || ''
  })
  const [specialPerformerCount, setSpecialPerformerCount] = useState(() => {
    const saved = localStorage.getItem('specialPerformerCount')
    return saved ? Number(saved) : 0
  })
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('volume')
    return saved ? Number(saved) : 50
  })
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('isMuted')
    return saved ? JSON.parse(saved) : false
  })
  const [selectedPureRegular, setSelectedPureRegular] = useState(() => {
    const saved = localStorage.getItem('selectedPureRegular')
    return saved || ''
  })
  const [idols, setIdols] = useState<Idol[]>(() => {
    const saved = localStorage.getItem('idols')
    return saved ? JSON.parse(saved) : []
  })
  const [performers, setPerformers] = useState<Performer[]>(() => {
    const saved = localStorage.getItem('performers')
    return saved ? JSON.parse(saved) : []
  })
  const [lotteryTableData, setLotteryTableData] = useState<string[]>(() => {
    const saved = localStorage.getItem('lotteryTableData')
    return saved ? JSON.parse(saved) : []
  })
  const [idolLotteryResults, setIdolLotteryResults] = useState<{ [key: number]: IdolLotteryResult }>(() => {
    const saved = localStorage.getItem('idolLotteryResults')
    return saved ? JSON.parse(saved) : {}
  })

  // GAS APIからデータを取得
  useEffect(() => {
    const loadFromSpreadsheet = async () => {
      try {
        const response = await fetch(GAS_URL)
        const data = await response.json()

        // Idolsのマージ処理
        if (data.idols) {
          const mergedIdols = data.idols.map((newItem: Idol) => {
            const oldItem = idols.find((o) => o.id === newItem.id)
            return { ...newItem, prev: oldItem ? oldItem.prev : false, done: oldItem ? oldItem.done : false }
          })
          setIdols(mergedIdols)
        }

        // Performersのマージ処理と計算
        if (data.performers) {
          const processedPerformers = data.performers.map((p: Performer) => {
            const loseCount = Number(p.loseCount) || 0
            const lastWin = Number(p.lastWin) || 0
            const lastBackup = Number(p.lastBackup) || 0
            const lastJoin = Number(p.lastJoin) || 0

            return {
              exclude: p.exclude === true || p.exclude === 'TRUE',
              priority: loseCount >= PRIORITY_LOSE_THRESHOLD || lastBackup > lastJoin,
              confirmed: lastWin > lastJoin,
              name: p.name || '',
              twitterId: p.twitterId || '',
              joinCount: p.joinCount || 0,
              loseCount: loseCount,
              lastWin: lastWin,
              lastBackup: lastBackup,
              lastJoin: lastJoin,
            }
          })
          setPerformers(processedPerformers)
        }

        console.log('GAS同期完了')
      } catch (error) {
        console.error('GAS同期失敗:', error)
      }
    }
    loadFromSpreadsheet()
  }, [])

  // LocalStorageに保存
  useEffect(() => {
    localStorage.setItem('volCount', String(volCount))
  }, [volCount])

  useEffect(() => {
    localStorage.setItem('isSpecialEnabled', JSON.stringify(isSpecialEnabled))
  }, [isSpecialEnabled])

  useEffect(() => {
    localStorage.setItem('specialVolText', specialVolText)
  }, [specialVolText])

  useEffect(() => {
    localStorage.setItem('specialPerformerCount', String(specialPerformerCount))
  }, [specialPerformerCount])

  useEffect(() => {
    localStorage.setItem('volume', String(volume))
  }, [volume])

  useEffect(() => {
    localStorage.setItem('isMuted', JSON.stringify(isMuted))
  }, [isMuted])

  useEffect(() => {
    localStorage.setItem('selectedPureRegular', selectedPureRegular)
  }, [selectedPureRegular])

  useEffect(() => {
    localStorage.setItem('idols', JSON.stringify(idols))
  }, [idols])

  useEffect(() => {
    localStorage.setItem('performers', JSON.stringify(performers))
  }, [performers])

  useEffect(() => {
    localStorage.setItem('lotteryTableData', JSON.stringify(lotteryTableData))
  }, [lotteryTableData])

  useEffect(() => {
    localStorage.setItem('idolLotteryResults', JSON.stringify(idolLotteryResults))
  }, [idolLotteryResults])

  const renderPage = () => {
    switch (activeTab) {
      case 'lottery':
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} selectedPureRegular={selectedPureRegular} performers={performers} lotteryTableData={lotteryTableData} setLotteryTableData={setLotteryTableData} idols={idols} setIdols={setIdols} idolLotteryResults={idolLotteryResults} setIdolLotteryResults={setIdolLotteryResults} />
      case 'lotteryIdol':
        return <LotteryIdolPage idols={idols} setIdols={setIdols} />
      case 'performer':
        return <PerformerPage selectedPureRegular={selectedPureRegular} setSelectedPureRegular={setSelectedPureRegular} performers={performers} setPerformers={setPerformers} />
      case 'appearance':
        return <AppearancePage />
      case 'settings':
        return (
          <SettingsPage
            volCount={volCount}
            setVolCount={setVolCount}
            isSpecialEnabled={isSpecialEnabled}
            setIsSpecialEnabled={setIsSpecialEnabled}
            specialVolText={specialVolText}
            setSpecialVolText={setSpecialVolText}
            specialPerformerCount={specialPerformerCount}
            setSpecialPerformerCount={setSpecialPerformerCount}
            volume={volume}
            setVolume={setVolume}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
          />
        )
      default:
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} selectedPureRegular={selectedPureRegular} performers={performers} lotteryTableData={lotteryTableData} setLotteryTableData={setLotteryTableData} idols={idols} setIdols={setIdols} idolLotteryResults={idolLotteryResults} setIdolLotteryResults={setIdolLotteryResults} />
    }
  }

  return (
    <main id="tab-view" className={activeTab === 'lottery' ? 'lottery-active' : ''}>
      <nav className="tabs" aria-label="メインタブ">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            aria-pressed={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="tab-content active">{renderPage()}</div>
    </main>
  )
}

export default App