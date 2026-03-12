import { useState, useEffect, useRef } from 'react'
import './App.css'

type TabKey = 'lottery' | 'lotteryIdol' | 'performer' | 'appearance' | 'settings'
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyhZ8PUsciHHMgff651G6tjlMjeZRfoo-yeIaq0e3jCdaZ_WSA52e2xcbUJqR50VXe6/exec'
const PRIORITY_LOSE_THRESHOLD = 3
const PUCHUN_TRIGGER_ID_LIST = ['2046']

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
type PerformerLotteryType = '確定' | '優先' | '通常'
type LotteryHistory = {
  performerName?: string
  type?: string
  idolIds?: string[]
  idolNames?: string[]
  idols?: { id?: string; name?: string }[]
  idol1Name?: string
  idol2Name?: string
  idol3Name?: string
  [key: string]: unknown
}

function LotteryPage({ volCount, isSpecialEnabled, specialVolText, specialPerformerCount, selectedPureRegular, performers, lotteryTableData, setLotteryTableData, performerLotteryTypes, setPerformerLotteryTypes, idols, setIdols, idolLotteryResults, setIdolLotteryResults, setAppearanceCheckStates, setBackupCheckStates, volume, isMuted }: { volCount: number; isSpecialEnabled: boolean; specialVolText: string; specialPerformerCount: number; selectedPureRegular: string; performers: Performer[]; lotteryTableData: string[]; setLotteryTableData: (data: string[]) => void; performerLotteryTypes: { [key: string]: PerformerLotteryType }; setPerformerLotteryTypes: (types: { [key: string]: PerformerLotteryType }) => void; idols: Idol[]; setIdols: (idols: Idol[]) => void; idolLotteryResults: { [key: number]: IdolLotteryResult }; setIdolLotteryResults: (results: { [key: number]: IdolLotteryResult }) => void; setAppearanceCheckStates: (states: { [key: number]: boolean }) => void; setBackupCheckStates: (states: { [key: number]: boolean }) => void; volume: number; isMuted: boolean }) {
  const logoPath = `${import.meta.env.BASE_URL}etc/NewP_Parade_logo.png`
  const [showNoTargetDialog, setShowNoTargetDialog] = useState(false)
  const [showNoPriorityDialog, setShowNoPriorityDialog] = useState(false)
  const [showNoRegularDialog, setShowNoRegularDialog] = useState(false)
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false)
  const [showVideoOverlay, setShowVideoOverlay] = useState(false)
  const [showPuchunVideo, setShowPuchunVideo] = useState(false)
  const [showTouchVideo, setShowTouchVideo] = useState(false)
  const [pendingLotteryRow, setPendingLotteryRow] = useState<number | null>(null) // ボタン位置ごとの抽選結果
  const deresuteVideoRef = useRef<HTMLVideoElement | null>(null)
  const puchunVideoRef = useRef<HTMLVideoElement | null>(null)
  const touchVideoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const normalizedVolume = Math.min(100, Math.max(0, volume)) / 100
    const targets = [deresuteVideoRef.current, puchunVideoRef.current, touchVideoRef.current]

    targets.forEach((video) => {
      if (!video) return
      video.volume = normalizedVolume
      video.muted = isMuted
    })
  }, [volume, isMuted, showVideoOverlay, showPuchunVideo, showTouchVideo])

  // Prevent scrolling when video overlay is active
  useEffect(() => {
    if (showVideoOverlay || showPuchunVideo || showTouchVideo) {
      document.body.classList.add('overlay-active')
    } else {
      document.body.classList.remove('overlay-active')
    }
    return () => {
      document.body.classList.remove('overlay-active')
    }
  }, [showVideoOverlay, showPuchunVideo, showTouchVideo])

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
    const newLotteryTypes = { ...performerLotteryTypes }
    let addedCount = 0

    for (let i = 0; i < confirmedNames.length && newTableData.length < maxRows; i++) {
      if (!displayedNames.has(confirmedNames[i])) {
        newTableData.push(confirmedNames[i])
        newLotteryTypes[confirmedNames[i]] = '確定'
        addedCount++
      }
    }

    if (addedCount === 0) {
      setShowNoTargetDialog(true)
      return
    }

    setLotteryTableData(newTableData)
    setPerformerLotteryTypes(newLotteryTypes)
  }

  const handleClearLottery = () => {
    setShowClearConfirmDialog(true)
  }

  const handleConfirmClear = () => {
    setLotteryTableData([])
    setPerformerLotteryTypes({})
    setIdolLotteryResults({})
    setAppearanceCheckStates({})
    setBackupCheckStates({})
    localStorage.removeItem('idolLotteryData')
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
    setPerformerLotteryTypes({
      ...performerLotteryTypes,
      [foundName]: '優先',
    })
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
    setPerformerLotteryTypes({
      ...performerLotteryTypes,
      [selectedName]: '通常',
    })
  }

  const handleIdolLottery = (rowIndex: number) => {
    // 動画を表示して、動画終了後に抽選を実行
    setPendingLotteryRow(rowIndex)
    setShowVideoOverlay(true)
  }

  const executeLottery = (rowIndex: number): boolean => {
    // 前回抽選がFalseで、抽選済みがFalseのアイドルを取得
    const availableIdols = idols.filter(idol => idol.prev !== true && idol.done !== true)

    if (availableIdols.length === 0) {
      setIdolLotteryResults({ ...idolLotteryResults, [rowIndex]: 'none' })
      return false
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

    // 行の1列目の名前を取得
    let rowName = ''
    if (rowIndex === 0) {
      rowName = selectedPureRegular
    } else if (rowIndex >= 1 && rowIndex <= 6) {
      rowName = lotteryTableData[rowIndex - 1] || ''
    } else if (rowIndex >= 7) {
      rowName = lotteryTableData[6 + (rowIndex - 7)] || ''
    }

    // LocalStorageに保存
    if (rowName) {
      const storageData = JSON.parse(localStorage.getItem('idolLotteryData') || '{}')
      storageData[rowName] = result
      localStorage.setItem('idolLotteryData', JSON.stringify(storageData))
    }
    console.log(localStorage.getItem('idolLotteryData'))

    // 指定IDが含まれているか確認し、50%の確率でtrueを返す
    const hasTargetId = selectedIdols.some(idol => PUCHUN_TRIGGER_ID_LIST.includes(String(idol.id)))
    console.log(selectedIdols)
    return hasTargetId && Math.random() < 0.5
  }

  const handleVideoEnd = () => {
    setShowVideoOverlay(false)
    if (pendingLotteryRow !== null) {
      const shouldShowPuchunVideo = executeLottery(pendingLotteryRow)
      setPendingLotteryRow(null)
      
      // deresute.webm終了後、条件を満たせばpuchun.mp4を表示
      if (shouldShowPuchunVideo) {
        setShowPuchunVideo(true)
      }
    }
  }

  const handlePuchunVideoEnd = () => {
    setShowPuchunVideo(false)
    setShowTouchVideo(true)
  }

  const handleTouchVideoClick = () => {
    setShowTouchVideo(false)
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
      {showVideoOverlay && (
        <div className="video-overlay">
          <video
            ref={deresuteVideoRef}
            className="fullscreen-video"
            autoPlay
            onEnded={handleVideoEnd}
            muted={isMuted}
            src={`${import.meta.env.BASE_URL}movie/deresute.webm`}
          />
        </div>
      )}
      {showPuchunVideo && (
        <div className="video-overlay">
          <video
            ref={puchunVideoRef}
            className="fullscreen-video"
            autoPlay
            onEnded={handlePuchunVideoEnd}
            muted={isMuted}
            src={`${import.meta.env.BASE_URL}movie/puchun.mp4`}
          />
        </div>
      )}
      {showTouchVideo && (
        <div className="video-overlay" onClick={handleTouchVideoClick}>
          <video
            ref={touchVideoRef}
            className="fullscreen-video"
            autoPlay
            loop
            muted={isMuted}
            src={`${import.meta.env.BASE_URL}movie/touch.mp4`}
          />
        </div>
      )}
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
      <div className="idol-filter-row">
        <div className="idol-filter-group">
          <label className="appearance-filter-label">前回抽選:</label>
          <select className="appearance-filter-select" value={prevFilter} onChange={(e) => setPrevFilter(e.target.value as 'all' | 'on' | 'off')}>
            <option value="all">すべて</option>
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </div>
        <div className="idol-filter-group">
          <label className="appearance-filter-label">抽選済:</label>
          <select className="appearance-filter-select" value={doneFilter} onChange={(e) => setDoneFilter(e.target.value as 'all' | 'on' | 'off')}>
            <option value="all">すべて</option>
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </div>
        <div className="idol-filter-group">
          <label className="appearance-filter-label">ブランド:</label>
          <select className="appearance-filter-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
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
      <div className="idol-bulk-actions">
        <button id="idol-reset-checks" className="lot-btn" onClick={handleResetAllCheckboxes}>
          全チェック解除
        </button>
        <button id="idol-reset-order" className="lot-btn" onClick={handleResetOrder}>
          ID順にリセット
        </button>
      </div>
      {filteredIdols && filteredIdols.length > 0 ? (
        <div className="appearance-table-wrap idol-table-wrap">
          <table className="appearance-table idol-table">
            <thead>
              <tr>
                <th className="idol-col-check idol-header-sort" onClick={() => handleHeaderClick('prev')}>前回抽選</th>
                <th className="idol-col-check idol-header-sort" onClick={() => handleHeaderClick('done')}>抽選済み</th>
                <th className="idol-header-sort" style={{ width: nameColumnWidth }} onClick={() => handleHeaderClick('name')}>名前</th>
                <th className="idol-col-brand idol-header-sort" onClick={() => handleHeaderClick('brand')}>ブランド</th>
                <th className="idol-col-win idol-header-sort" onClick={() => handleHeaderClick('winCount')}>当選回数</th>
              </tr>
            </thead>
            <tbody>
              {filteredIdols.map((idol, idx) => (
                <tr key={idol.id || idx}>
                  <td className="idol-col-check">
                    <input
                      type="checkbox"
                      checked={idol.prev || false}
                      onChange={() => {
                        const originalIdx = idols.findIndex((i) => i.id === idol.id)
                        handlePrevChange(originalIdx)
                      }}
                      className="appearance-check-input"
                    />
                  </td>
                  <td className="idol-col-check">
                    <input
                      type="checkbox"
                      checked={idol.done || false}
                      onChange={() => {
                        const originalIdx = idols.findIndex((i) => i.id === idol.id)
                        handleDoneChange(originalIdx)
                      }}
                      className="appearance-check-input"
                    />
                  </td>
                  <td>{idol.name}</td>
                  <td className="idol-col-brand">{(idol as { brand?: string }).brand || ''}</td>
                  <td className="idol-col-win">{idol.winCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="appearance-empty-message">フィルター条件に該当するデータはありません</p>
      )}
    </section>
  )
}

function PerformerPage({ selectedPureRegular, setSelectedPureRegular, performers, setPerformers }: { selectedPureRegular: string; setSelectedPureRegular: (val: string) => void; performers: Performer[]; setPerformers: (performers: Performer[]) => void }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const pureRegularOptions = ["colorfu√", "MitsubaProject", "わたげ改", "黒糖"]

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
        <div className="appearance-table-wrap performer-table-wrap">
          <table className="appearance-table performer-table">
            <thead>
              <tr>
                <th className="performer-col-status">状態</th>
                <th className="performer-col-name">名前</th>
              </tr>
            </thead>
            <tbody>
              {performers.map((performer, idx) => (
                <tr key={idx} className={performer.exclude ? 'performer-row-excluded' : ''}>
                  <td className="performer-col-status performer-status-cell" onClick={() => setEditingIdx(idx)}>
                    {editingIdx === idx ? (
                      <select
                        value={getStatusValue(performer)}
                        onChange={(e) => handleStatusChange(idx, e.target.value)}
                        onBlur={() => setEditingIdx(null)}
                        autoFocus
                        className="performer-status-select"
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
                  <td className="performer-col-name">{performer.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="appearance-empty-message">データはまだ読み込まれていません</p>
      )}
    </section>
  )
}

function AppearancePage({ idols, setIdols, appearanceCheckStates, setAppearanceCheckStates, lotteryHistory }: { idols: Idol[]; setIdols: (idols: Idol[]) => void; appearanceCheckStates: { [key: number]: boolean }; setAppearanceCheckStates: (states: { [key: number]: boolean }) => void; lotteryHistory: LotteryHistory[] }) {
  const [showRegisterConfirmDialog, setShowRegisterConfirmDialog] = useState(false)
  const [isSubmitting] = useState(false)
  const [registerErrorMessage, setRegisterErrorMessage] = useState('')
  const [selectedVolFilter, setSelectedVolFilter] = useState('')

  const getFirstStringValue = (entry: LotteryHistory, keys: string[]) => {
    for (const key of keys) {
      const value = entry[key]
      if (value === null || value === undefined) continue
      const text = String(value).trim()
      if (text) return text
    }
    return ''
  }

  const handleAppearanceCheckChange = (rowIndex: number) => {
    const nextChecked = !appearanceCheckStates[rowIndex]
    setAppearanceCheckStates({
      ...appearanceCheckStates,
      [rowIndex]: nextChecked,
    })
  }

  const displayRows = Array.isArray(lotteryHistory)
    ? lotteryHistory.map((entry, rowIndex) => ({
        rowIndex,
        vol: getFirstStringValue(entry, ['Vol', 'vol', 'VOL']),
        djName: getFirstStringValue(entry, ['DJ名', 'performerName', 'name', '名前', '演者名', '演者']),
        category: getFirstStringValue(entry, ['区分', 'type', '抽選区分', '種別']),
        idol1: getFirstStringValue(entry, ['IDチェック1', '抽選アイドルID1', '抽選アイドル1', '抽選アイドル名1', 'アイドル名1']),
        idol2: getFirstStringValue(entry, ['IDチェック2', '抽選アイドルID2', '抽選アイドル2', '抽選アイドル名2', 'アイドル名2']),
        idol3: getFirstStringValue(entry, ['IDチェック3', '抽選アイドルID3', '抽選アイドル3', '抽選アイドル名3', 'アイドル名3']),
      }))
    : []

  const volFilterOptions = Array.from(
    new Set(displayRows.map((row) => row.vol).filter((vol) => vol))
  )

  const filteredDisplayRows = selectedVolFilter
    ? displayRows.filter((row) => row.vol === selectedVolFilter)
    : displayRows

  // 出演登録ボタンクリック時の処理（確認ダイアログを表示）
  const handleRegisterClick = () => {
    setRegisterErrorMessage('')
    setShowRegisterConfirmDialog(true)
  }

  const buildSelectedResults = () => {
    const idolById = new Map(idols.map((idol) => [String(idol.id || ''), idol]))
    const idolByName = new Map(idols.map((idol) => [idol.name, idol]))

    const results = filteredDisplayRows
      .filter((row) => appearanceCheckStates[row.rowIndex])
      .map((row) => {
        const rawValues = [row.idol1, row.idol2, row.idol3]
          .map((value) => String(value || '').trim())
          .filter((value) => value)

        const idolIds: string[] = []
        const idolNames: string[] = []

        rawValues.forEach((value) => {
          const idolByMatchedId = idolById.get(value)
          if (idolByMatchedId) {
            const matchedId = String(idolByMatchedId.id || '')
            if (matchedId && !idolIds.includes(matchedId)) idolIds.push(matchedId)
            if (idolByMatchedId.name && !idolNames.includes(idolByMatchedId.name)) idolNames.push(idolByMatchedId.name)
            return
          }

          const idolByMatchedName = idolByName.get(value)
          if (idolByMatchedName) {
            const matchedId = String(idolByMatchedName.id || '')
            if (matchedId && !idolIds.includes(matchedId)) idolIds.push(matchedId)
            if (idolByMatchedName.name && !idolNames.includes(idolByMatchedName.name)) idolNames.push(idolByMatchedName.name)
            return
          }

          if (!idolNames.includes(value)) idolNames.push(value)
        })

        return {
          performerName: row.djName,
          type: row.category === '補欠' ? '補欠' : '通常',
          idolIds,
          idolNames,
        }
      })
      .filter((entry) => entry.idolIds.length > 0 || entry.idolNames.length > 0)

    return results
  }

  // 確認後の出演登録処理
  const handleConfirmRegister = () => {
    const results = buildSelectedResults()

    if (results.length === 0) {
      setRegisterErrorMessage('更新対象の抽選アイドルデータがありません')
      return
    }

    // 1. 抽選アイドル管理タブのチェックボックスを全てリセット
    const resetIdols = idols.map((idol) => ({
      ...idol,
      prev: false,
      done: false,
    }))

    // 2. チェックが入っている行のアイドルを特定
    const checkedIdolIds = new Set<string>()
    const checkedIdolNames = new Set<string>()
    results.forEach((result) => {
      result.idolIds.forEach((idolId) => {
        checkedIdolIds.add(String(idolId))
      })
      result.idolNames.forEach((idolName) => {
        checkedIdolNames.add(idolName)
      })
    })

    // 3. チェックされたアイドルの prev を true に設定
    const updatedIdols = resetIdols.map((idol) => {
      const idolId = String(idol.id || '')
      if ((idolId && checkedIdolIds.has(idolId)) || checkedIdolNames.has(idol.name)) {
        return { ...idol, prev: true }
      }
      return idol
    })

    setIdols(updatedIdols)
    setShowRegisterConfirmDialog(false)
  }
  return (
    <section className="tab-page other-tab-page">
      {showRegisterConfirmDialog && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowRegisterConfirmDialog(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>確認</h3>
            </div>
            <div className="modal-body">
              <p>抽選アイドルを更新しますか？</p>
              {registerErrorMessage && <p style={{ color: '#eb5757' }}>{registerErrorMessage}</p>}
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowRegisterConfirmDialog(false)} disabled={isSubmitting}>キャンセル</button>
              <button className="modal-btn" onClick={handleConfirmRegister} disabled={isSubmitting}>{isSubmitting ? '送信中...' : '更新'}</button>
            </div>
          </div>
        </div>
      )}
      <h2>出演管理</h2>
      <div style={{ marginBottom: '16px', marginLeft: '-24px' }}>
        <button id="register-appearance" className="lot-btn" type="button" onClick={handleRegisterClick}>出演登録</button>
      </div>
      <div className="appearance-filter-wrap">
        <label htmlFor="appearance-vol-filter" className="appearance-filter-label">Vol絞り込み</label>
        <select
          id="appearance-vol-filter"
          value={selectedVolFilter}
          onChange={(e) => setSelectedVolFilter(e.target.value)}
          className="appearance-filter-select"
        >
          <option value="">全て</option>
          {volFilterOptions.map((vol) => (
            <option key={vol} value={vol}>{vol}</option>
          ))}
        </select>
      </div>
      {filteredDisplayRows.length > 0 ? (
        <div className="appearance-table-wrap">
          <table className="appearance-table">
            <thead>
              <tr>
                <th>Vol</th>
                <th>DJ名</th>
                <th>区分</th>
                <th>抽選アイドル1</th>
                <th>抽選アイドル2</th>
                <th>抽選アイドル3</th>
                <th className="appearance-col-check">出演</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisplayRows.map((row) => (
                <tr key={row.rowIndex}>
                  <td>{row.vol}</td>
                  <td>{row.djName}</td>
                  <td>{row.category}</td>
                  <td>{row.idol1}</td>
                  <td>{row.idol2}</td>
                  <td>{row.idol3}</td>
                  <td className="appearance-col-check">
                    <input
                      type="checkbox"
                      checked={appearanceCheckStates[row.rowIndex] || false}
                      onChange={() => handleAppearanceCheckChange(row.rowIndex)}
                      className="appearance-check-input"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="appearance-empty-message">{displayRows.length > 0 ? '該当する出演データはありません' : '出演データはありません'}</p>
      )}
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
  const autoSaveInFlightRef = useRef(false)
  const lastAutoSavedPayloadRef = useRef('')
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
  const [performerLotteryTypes, setPerformerLotteryTypes] = useState<{ [key: string]: PerformerLotteryType }>(() => {
    const saved = localStorage.getItem('performerLotteryTypes')
    return saved ? JSON.parse(saved) : {}
  })
  const [idolLotteryResults, setIdolLotteryResults] = useState<{ [key: number]: IdolLotteryResult }>(() => {
    const saved = localStorage.getItem('idolLotteryResults')
    return saved ? JSON.parse(saved) : {}
  })
  const [appearanceCheckStates, setAppearanceCheckStates] = useState<{ [key: number]: boolean }>(() => {
    const saved = localStorage.getItem('appearanceCheckStates')
    return saved ? JSON.parse(saved) : {}
  })
  const [backupCheckStates, setBackupCheckStates] = useState<{ [key: number]: boolean }>(() => {
    const saved = localStorage.getItem('backupCheckStates')
    return saved ? JSON.parse(saved) : {}
  })
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistory[]>([])

  // GAS APIからデータを取得
  useEffect(() => {
    const loadFromSpreadsheet = async () => {
      try {
        const response = await fetch(GAS_URL)
        const data = await response.json()
        console.log(data)

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

        if (Array.isArray(data.lotteryHistory)) {
          setLotteryHistory(data.lotteryHistory)
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
    localStorage.setItem('performerLotteryTypes', JSON.stringify(performerLotteryTypes))
  }, [performerLotteryTypes])

  useEffect(() => {
    localStorage.setItem('idolLotteryResults', JSON.stringify(idolLotteryResults))
  }, [idolLotteryResults])

  useEffect(() => {
    localStorage.setItem('appearanceCheckStates', JSON.stringify(appearanceCheckStates))
  }, [appearanceCheckStates])

  useEffect(() => {
    localStorage.setItem('backupCheckStates', JSON.stringify(backupCheckStates))
  }, [backupCheckStates])

  useEffect(() => {
    const totalRows = isSpecialEnabled ? specialPerformerCount : 10

    if (totalRows <= 0) return

    const getPerformerNameByRowIndex = (rowIndex: number): string => {
      if (isSpecialEnabled) {
        if (rowIndex === 0) return selectedPureRegular
        return lotteryTableData[rowIndex - 1] || ''
      }

      if (rowIndex === 0) return selectedPureRegular
      if (rowIndex >= 1 && rowIndex <= 6) return lotteryTableData[rowIndex - 1] || ''
      return lotteryTableData[6 + (rowIndex - 7)] || ''
    }

    const builtResults: { performerName: string; type: '通常' | '補欠'; idolIds: string[] }[] = []

    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const performerName = getPerformerNameByRowIndex(rowIndex)
      const result = idolLotteryResults[rowIndex]

      if (!performerName || result === undefined) {
        return
      }

      const rowNumber = rowIndex + 1
      const type: '通常' | '補欠' = isSpecialEnabled && rowNumber >= 8 && rowNumber <= 10 ? '補欠' : '通常'

      builtResults.push({
        performerName,
        type,
        idolIds: result === 'none' ? [] : result.map((idol) => idol.id),
      })
    }

    if (builtResults.length === 0) return

    const payload = {
      action: 'saveLotteryResults',
      vol: isSpecialEnabled ? specialVolText : String(volCount),
      results: builtResults,
    }
    const payloadKey = JSON.stringify(payload)

    if (autoSaveInFlightRef.current || lastAutoSavedPayloadRef.current === payloadKey) {
      return
    }

    autoSaveInFlightRef.current = true

    const saveToGAS = async () => {
      try {
        const response = await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const res = await response.json()

        if (!res.success) {
          throw new Error(typeof res.message === 'string' ? res.message : '保存に失敗しました')
        }

        lastAutoSavedPayloadRef.current = payloadKey
        console.log('抽選結果を自動登録しました')
      } catch (error) {
        console.error('抽選結果の自動登録に失敗:', error)
      } finally {
        autoSaveInFlightRef.current = false
      }
    }

    void saveToGAS()
  }, [idolLotteryResults, lotteryTableData, selectedPureRegular, isSpecialEnabled, specialPerformerCount, specialVolText, volCount])

  const renderPage = () => {
    switch (activeTab) {
      case 'lottery':
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} selectedPureRegular={selectedPureRegular} performers={performers} lotteryTableData={lotteryTableData} setLotteryTableData={setLotteryTableData} performerLotteryTypes={performerLotteryTypes} setPerformerLotteryTypes={setPerformerLotteryTypes} idols={idols} setIdols={setIdols} idolLotteryResults={idolLotteryResults} setIdolLotteryResults={setIdolLotteryResults} setAppearanceCheckStates={setAppearanceCheckStates} setBackupCheckStates={setBackupCheckStates} volume={volume} isMuted={isMuted} />
      case 'lotteryIdol':
        return <LotteryIdolPage idols={idols} setIdols={setIdols} />
      case 'performer':
        return <PerformerPage selectedPureRegular={selectedPureRegular} setSelectedPureRegular={setSelectedPureRegular} performers={performers} setPerformers={setPerformers} />
      case 'appearance':
        return <AppearancePage idols={idols} setIdols={setIdols} appearanceCheckStates={appearanceCheckStates} setAppearanceCheckStates={setAppearanceCheckStates} lotteryHistory={lotteryHistory} />
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
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} selectedPureRegular={selectedPureRegular} performers={performers} lotteryTableData={lotteryTableData} setLotteryTableData={setLotteryTableData} performerLotteryTypes={performerLotteryTypes} setPerformerLotteryTypes={setPerformerLotteryTypes} idols={idols} setIdols={setIdols} idolLotteryResults={idolLotteryResults} setIdolLotteryResults={setIdolLotteryResults} setAppearanceCheckStates={setAppearanceCheckStates} setBackupCheckStates={setBackupCheckStates} volume={volume} isMuted={isMuted} />
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