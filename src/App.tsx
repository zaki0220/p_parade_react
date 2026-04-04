import { useState, useEffect, useRef } from 'react'
import './App.css'
import logoImage from './assets/etc/NewP_Parade_logo.png'
import deresuteVideo from './assets/movie/deresute.webm'
import puchunVideo from './assets/movie/puchun.mp4'
import touchVideo from './assets/movie/touch.mp4'

type TabKey = 'lottery' | 'lotteryIdol' | 'performer' | 'appearance' | 'settings'
const GAS_URL = import.meta.env.VITE_GAS_URL
if (!GAS_URL) {
  throw new Error('VITE_GAS_URL is not set. Please configure .env.development or .env.production.')
}
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

type SelectOption = {
  value: string
  label: string
}

function UnifiedSelect({ value, options, onChange, triggerClassName, menuClassName, placeholder = '', description, autoFocus = false, disabled = false, onClose }: { value: string; options: SelectOption[]; onChange: (value: string) => void; triggerClassName: string; menuClassName?: string; placeholder?: string; description?: string; autoFocus?: boolean; disabled?: boolean; onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listboxIdRef = useRef(`custom-select-${Math.random().toString(36).slice(2)}`)
  const selectIdRef = useRef(`custom-select-instance-${Math.random().toString(36).slice(2)}`)

  const selectedOption = options.find((option) => option.value === value)

  const closeMenu = () => {
    setIsOpen(false)
    if (onClose) onClose()
  }

  const openMenu = () => {
    setIsOpen(true)
    window.dispatchEvent(new CustomEvent('unified-select-open', { detail: { id: selectIdRef.current } }))
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return
      const target = event.target as Node | null
      if (target && !containerRef.current.contains(target)) {
        closeMenu()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('touchstart', handlePointerDownOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('touchstart', handlePointerDownOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    const handleOtherSelectOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const openedSelectId = customEvent.detail?.id
      if (!openedSelectId || openedSelectId === selectIdRef.current) return
      if (isOpen) {
        closeMenu()
      }
    }

    window.addEventListener('unified-select-open', handleOtherSelectOpen as EventListener)
    return () => {
      window.removeEventListener('unified-select-open', handleOtherSelectOpen as EventListener)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (disabled) return
    if (isOpen) {
      closeMenu()
      return
    }
    openMenu()
  }

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    closeMenu()
  }

  return (
    <div
      ref={containerRef}
      className="custom-select"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`${triggerClassName}${description ? ' custom-select-has-description' : ''}${isOpen ? ' custom-select-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxIdRef.current}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault()
            openMenu()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            closeMenu()
          }
        }}
        autoFocus={autoFocus}
        disabled={disabled}
      >
        <span className="custom-select-texts">
          {description && <span className="custom-select-description">{description}</span>}
          <span className={`custom-select-label${description ? ' custom-select-label-sub' : ''}`}>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <span className="custom-select-chevron" aria-hidden="true">▾</span>
      </button>
      {isOpen && (
        <ul id={listboxIdRef.current} role="listbox" className={`custom-select-menu${menuClassName ? ` ${menuClassName}` : ''}`}>
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`custom-select-option-btn${isSelected ? ' custom-select-option-selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function LotteryPage({ volCount, isSpecialEnabled, specialVolText, specialPerformerCount, selectedPureRegular, performers, lotteryTableData, setLotteryTableData, performerLotteryTypes, setPerformerLotteryTypes, idols, setIdols, idolLotteryResults, setIdolLotteryResults, setAppearanceCheckStates, setBackupCheckStates, volume, isMuted, isPuchunEnabled, isIdolLotteryEffectEnabled }: { volCount: number; isSpecialEnabled: boolean; specialVolText: string; specialPerformerCount: number; selectedPureRegular: string; performers: Performer[]; lotteryTableData: string[]; setLotteryTableData: (data: string[]) => void; performerLotteryTypes: { [key: string]: PerformerLotteryType }; setPerformerLotteryTypes: (types: { [key: string]: PerformerLotteryType }) => void; idols: Idol[]; setIdols: (idols: Idol[]) => void; idolLotteryResults: { [key: number]: IdolLotteryResult }; setIdolLotteryResults: (results: { [key: number]: IdolLotteryResult }) => void; setAppearanceCheckStates: (states: { [key: number]: boolean }) => void; setBackupCheckStates: (states: { [key: number]: boolean }) => void; volume: number; isMuted: boolean; isPuchunEnabled: boolean; isIdolLotteryEffectEnabled: boolean }) {
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
    if (!isIdolLotteryEffectEnabled) {
      executeLottery(rowIndex)
      return
    }

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
    return isPuchunEnabled && hasTargetId && Math.random() < 0.5
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
          <div className="lottery-table-wrap">
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
        </div>
      )
    } else {
      return (
        <div id="lottery-container">
          <div className="lottery-table-wrap">
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
          </div>

          <h4 style={{ marginTop: '10px', marginLeft: '12px', marginBottom: '0' }}>補欠枠</h4>

          <div className="lottery-table-wrap">
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
            src={deresuteVideo}
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
            src={puchunVideo}
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
            src={touchVideo}
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
          <img className="logo-img" src={logoImage} alt="P Parade ロゴ" />
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

function LotteryIdolPage({ idols, setIdols, onRefreshIdols }: { idols: Idol[]; setIdols: (idols: Idol[]) => void; onRefreshIdols: () => Promise<void> }) {
  const [prevFilter, setPrevFilter] = useState<'all' | 'on' | 'off'>('all')
  const [doneFilter, setDoneFilter] = useState<'all' | 'on' | 'off'>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'prev' | 'done' | 'name' | 'brand' | 'winCount' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshErrorMessage, setRefreshErrorMessage] = useState('')

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

  const handleRefreshClick = async () => {
    setRefreshErrorMessage('')
    setIsRefreshing(true)
    try {
      await onRefreshIdols()
    } catch (error) {
      const message = error instanceof Error ? error.message : '最新情報の取得に失敗しました'
      setRefreshErrorMessage(message)
    } finally {
      setIsRefreshing(false)
    }
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
          <UnifiedSelect
            triggerClassName="appearance-filter-select"
            value={prevFilter}
            onChange={(nextValue) => setPrevFilter(nextValue as 'all' | 'on' | 'off')}
            description="前回抽選"
            options={[
              { value: 'all', label: 'すべて' },
              { value: 'on', label: 'ON' },
              { value: 'off', label: 'OFF' },
            ]}
          />
        </div>
        <div className="idol-filter-group">
          <UnifiedSelect
            triggerClassName="appearance-filter-select"
            value={doneFilter}
            onChange={(nextValue) => setDoneFilter(nextValue as 'all' | 'on' | 'off')}
            description="抽選済"
            options={[
              { value: 'all', label: 'すべて' },
              { value: 'on', label: 'ON' },
              { value: 'off', label: 'OFF' },
            ]}
          />
        </div>
        <div className="idol-filter-group">
          <UnifiedSelect
            triggerClassName="appearance-filter-select"
            menuClassName="idol-brand-menu"
            value={brandFilter}
            onChange={setBrandFilter}
            description="ブランド"
            options={[
              { value: 'all', label: 'すべて' },
              ...brands.map((brand) => ({ value: String(brand), label: String(brand) })),
            ]}
          />
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
        <button id="refresh-idols" className="lot-btn" type="button" onClick={() => void handleRefreshClick()} disabled={isRefreshing}>
          {isRefreshing ? '更新中...' : '最新情報に更新'}
        </button>
      </div>
      {refreshErrorMessage && <p className="appearance-error-message">{refreshErrorMessage}</p>}
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

function PerformerPage({ selectedPureRegular, setSelectedPureRegular, performers, setPerformers, onRefreshPerformers }: { selectedPureRegular: string; setSelectedPureRegular: (val: string) => void; performers: Performer[]; setPerformers: (performers: Performer[]) => void; onRefreshPerformers: () => Promise<void> }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshErrorMessage, setRefreshErrorMessage] = useState('')
  const pureRegularOptions = ["colorfu√", "MitsubaProject", "わたげ改", "黒糖"]

  const getStatusBadges = (performer: Performer) => {
    const badges = []
    if (performer.exclude) badges.push(<span key="exclude" className="performer-status-badge performer-status-exclude">除外</span>)
    if (performer.priority) badges.push(<span key="priority" className="performer-status-badge performer-status-priority">優先</span>)
    if (performer.confirmed) badges.push(<span key="confirmed" className="performer-status-badge performer-status-confirmed">確定</span>)
    return badges.length > 0 ? badges : <span className="performer-status-badge performer-status-normal">通常</span>
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

  const handleRefreshClick = async () => {
    setRefreshErrorMessage('')
    setIsRefreshing(true)
    setEditingIdx(null)
    try {
      await onRefreshPerformers()
    } catch (error) {
      const message = error instanceof Error ? error.message : '最新情報の取得に失敗しました'
      setRefreshErrorMessage(message)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <section className="tab-page other-tab-page">
      <h2>演者管理</h2>
      <div className="performer-regular-setting">
        <h3>準レギュラー設定</h3>
        <UnifiedSelect
          triggerClassName="appearance-filter-select"
          value={selectedPureRegular}
          onChange={setSelectedPureRegular}
          placeholder="選択してください"
          options={[
            { value: '', label: '選択してください' },
            ...pureRegularOptions.map((option) => ({ value: option, label: option })),
          ]}
        />
      </div>
      <div className="appearance-action-row">
        <button id="refresh-performers" className="lot-btn" type="button" onClick={() => void handleRefreshClick()} disabled={isRefreshing}>
          {isRefreshing ? '更新中...' : '最新情報に更新'}
        </button>
      </div>
      {refreshErrorMessage && <p className="appearance-error-message">{refreshErrorMessage}</p>}
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
                      <UnifiedSelect
                        triggerClassName="performer-status-select"
                        menuClassName="performer-status-menu"
                        value={getStatusValue(performer)}
                        onChange={(nextValue) => handleStatusChange(idx, nextValue)}
                        onClose={() => setEditingIdx(null)}
                        autoFocus
                        options={[
                          { value: 'normal', label: '通常' },
                          { value: 'exclude', label: '除外' },
                          { value: 'priority', label: '優先' },
                          { value: 'confirmed', label: '確定' },
                        ]}
                      />
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

function AppearancePage({ appearanceCheckStates, setAppearanceCheckStates, registerCheckStates, setRegisterCheckStates, lotteryHistory, onRefreshLotteryHistory }: { appearanceCheckStates: { [key: number]: boolean }; setAppearanceCheckStates: (states: { [key: number]: boolean }) => void; registerCheckStates: { [key: number]: boolean }; setRegisterCheckStates: (states: { [key: number]: boolean }) => void; lotteryHistory: LotteryHistory[]; onRefreshLotteryHistory: () => Promise<LotteryHistory[]> }) {
  const [showRegisterConfirmDialog, setShowRegisterConfirmDialog] = useState(false)
  const [isRegisterCompleted, setIsRegisterCompleted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registerErrorMessage, setRegisterErrorMessage] = useState('')
  const [selectedVolFilter, setSelectedVolFilter] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshErrorMessage, setRefreshErrorMessage] = useState('')
  const hasInitializedVolFilterRef = useRef(false)

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

  const handleRegisterCheckChange = (rowIndex: number) => {
    const nextChecked = !registerCheckStates[rowIndex]
    setRegisterCheckStates({
      ...registerCheckStates,
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

  useEffect(() => {
    if (volFilterOptions.length === 0) {
      if (selectedVolFilter !== '') {
        setSelectedVolFilter('')
      }
      hasInitializedVolFilterRef.current = false
      return
    }

    const latestVol = volFilterOptions[volFilterOptions.length - 1]

    // 初回のみ最新Volを自動選択する。以降は「全て」の選択を維持する
    if (!hasInitializedVolFilterRef.current && selectedVolFilter === '') {
      setSelectedVolFilter(latestVol)
      hasInitializedVolFilterRef.current = true
      return
    }

    // 現在の選択が候補から消えた場合のみ最新Volへフォールバック
    if (selectedVolFilter !== '' && !volFilterOptions.includes(selectedVolFilter)) {
      setSelectedVolFilter(latestVol)
    }
  }, [volFilterOptions, selectedVolFilter])

  const filteredDisplayRows = selectedVolFilter
    ? displayRows.filter((row) => row.vol === selectedVolFilter)
    : displayRows

  useEffect(() => {
    if (displayRows.length === 0) return

    const visibleRowIndexSet = new Set(filteredDisplayRows.map((row) => row.rowIndex))
    const nextStates = { ...registerCheckStates }
    let hasChanges = false

    for (const row of displayRows) {
      if (nextStates[row.rowIndex] !== undefined) continue

      nextStates[row.rowIndex] = visibleRowIndexSet.has(row.rowIndex)
      hasChanges = true
    }

    if (hasChanges) {
      setRegisterCheckStates(nextStates)
    }
  }, [displayRows, filteredDisplayRows, registerCheckStates, setRegisterCheckStates])

  // 出演登録ボタンクリック時の処理（確認ダイアログを表示）
  const handleRegisterClick = () => {
    setRegisterErrorMessage('')
    setIsRegisterCompleted(false)
    setShowRegisterConfirmDialog(true)
  }

  const handleRefreshClick = async () => {
    setRefreshErrorMessage('')
    setIsRefreshing(true)
    try {
      const refreshedHistory = await onRefreshLotteryHistory()
      const refreshedRows = Array.isArray(refreshedHistory)
        ? refreshedHistory.map((entry) => getFirstStringValue(entry, ['Vol', 'vol', 'VOL'])).filter((vol) => vol)
        : []
      const latestVol = refreshedRows.length > 0 ? refreshedRows[refreshedRows.length - 1] : ''
      hasInitializedVolFilterRef.current = true
      setSelectedVolFilter(latestVol)
    } catch (error) {
      const message = error instanceof Error ? error.message : '最新情報の取得に失敗しました'
      setRefreshErrorMessage(message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // 確認後の出演登録処理
  const handleConfirmRegister = async () => {
    setRegisterErrorMessage('')

    // 登録チェックが入っている行を取得
    const targetRows = filteredDisplayRows.filter((row) => registerCheckStates[row.rowIndex])

    if (targetRows.length === 0) {
      setRegisterErrorMessage('登録対象の行が選択されていません')
      return
    }

    const results = targetRows.map((row) => ({
      performerId: lotteryHistory[row.rowIndex]['No'],
      appearanceResult: appearanceCheckStates[row.rowIndex] || false,
    }))

    setIsSubmitting(true)
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveAppearanceResults', results }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const res = await response.json()
      if (!res.success) {
        throw new Error(typeof res.message === 'string' ? res.message : '出演登録に失敗しました')
      }

      setIsRegisterCompleted(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : '出演登録に失敗しました'
      setRegisterErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
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
              <p>{isRegisterCompleted ? '出演登録が完了しました' : '出演結果を登録しますか？'}</p>
              {registerErrorMessage && <p style={{ color: '#eb5757' }}>{registerErrorMessage}</p>}
            </div>
            <div className={isRegisterCompleted ? 'modal-footer modal-footer-center' : 'modal-footer'}>
              {isRegisterCompleted ? (
                <button
                  className="modal-btn modal-btn-ok"
                  onClick={() => {
                    setShowRegisterConfirmDialog(false)
                    setIsRegisterCompleted(false)
                  }}
                >
                  OK
                </button>
              ) : (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={() => setShowRegisterConfirmDialog(false)} disabled={isSubmitting}>キャンセル</button>
                  <button className="modal-btn" onClick={() => void handleConfirmRegister()} disabled={isSubmitting}>{isSubmitting ? '送信中...' : '登録'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <h2>出演管理</h2>
      <div className="appearance-action-row">
        <button id="register-appearance" className="lot-btn" type="button" onClick={handleRegisterClick}>出演登録</button>
        <button id="refresh-appearance" className="lot-btn" type="button" onClick={() => void handleRefreshClick()} disabled={isRefreshing}>
          {isRefreshing ? '更新中...' : '最新情報に更新'}
        </button>
      </div>
      {refreshErrorMessage && <p className="appearance-error-message">{refreshErrorMessage}</p>}
      <div className="appearance-filter-wrap">
        <UnifiedSelect
          triggerClassName="appearance-filter-select"
          value={selectedVolFilter}
          onChange={setSelectedVolFilter}
          description="Vol絞り込み"
          options={[
            { value: '', label: '全て' },
            ...volFilterOptions.map((vol) => ({ value: vol, label: vol })),
          ]}
        />
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
                <th className="appearance-col-check">登録</th>
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
                  <td className="appearance-col-check">
                    <input
                      type="checkbox"
                      checked={registerCheckStates[row.rowIndex] || false}
                      onChange={() => handleRegisterCheckChange(row.rowIndex)}
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

function SettingsPage({ volCount, setVolCount, isSpecialEnabled, setIsSpecialEnabled, specialVolText, setSpecialVolText, specialPerformerCount, setSpecialPerformerCount, volume, setVolume, isMuted, setIsMuted, isPuchunEnabled, setIsPuchunEnabled, isIdolLotteryEffectEnabled, setIsIdolLotteryEffectEnabled }: { volCount: number; setVolCount: (val: number) => void; isSpecialEnabled: boolean; setIsSpecialEnabled: (val: boolean) => void; specialVolText: string; setSpecialVolText: (val: string) => void; specialPerformerCount: number; setSpecialPerformerCount: (val: number) => void; volume: number; setVolume: (val: number) => void; isMuted: boolean; setIsMuted: (val: boolean) => void; isPuchunEnabled: boolean; setIsPuchunEnabled: (val: boolean) => void; isIdolLotteryEffectEnabled: boolean; setIsIdolLotteryEffectEnabled: (val: boolean) => void }) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <section className="tab-page other-tab-page">
      <div className="settings-group">
        <h2>通常回Vol管理</h2>
        <h3>現在のVol数</h3>
        <div className="settings-input-row">
          <input
            className="settings-input"
            type="number"
            min="0"
            value={volCount}
            onChange={(e) => setVolCount(Number(e.target.value))}
          />
          回
        </div>
      </div>

      <div className="settings-group">
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
        <div className="settings-input-row">
          <input
            className="settings-input"
            type="text"
            value={specialVolText}
            onChange={(e) => setSpecialVolText(e.target.value)}
          />
        </div>
        <h3>特殊回の出演者数</h3>
        <div className="settings-input-row">
          <input
            className="settings-input"
            type="number"
            min="0"
            value={specialPerformerCount}
            onChange={(e) => setSpecialPerformerCount(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="settings-group">
        <h2>音量調節</h2>
        <div className="volume-control-wrapper">
          <span className="volume-icon">🔈</span>
          <div className="volume-slider-wrapper">
            {isDragging && (
              <div
                className="volume-tooltip"
                style={{ left: `calc(${volume}% - ${volume * 0.18 - 9}px)` }}
              >
                {volume}%
              </div>
            )}
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="volume-slider"
              style={{ background: `linear-gradient(to right, #27ae60 ${volume}%, #ddd ${volume}%)` }}
              onPointerDown={() => setIsDragging(true)}
              onPointerUp={() => setIsDragging(false)}
              onPointerCancel={() => setIsDragging(false)}
            />
          </div>
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
      </div>

      <div className="settings-group">
        <h2>演出設定</h2>
        <div className="special-enable-wrapper">
          <input
            id="idol-lottery-effect-toggle"
            type="checkbox"
            checked={isIdolLotteryEffectEnabled}
            onChange={(e) => setIsIdolLotteryEffectEnabled(e.target.checked)}
            className="toggle-switch-input"
          />
          <label htmlFor="idol-lottery-effect-toggle" className="toggle-switch-label" />
          <label htmlFor="idol-lottery-effect-toggle" className="special-enable-label">
            アイドル抽選演出を有効にする
          </label>
        </div>
        <div className="special-enable-wrapper">
          <input
            id="puchun-enable-toggle"
            type="checkbox"
            checked={isPuchunEnabled}
            onChange={(e) => setIsPuchunEnabled(e.target.checked)}
            className="toggle-switch-input"
          />
          <label htmlFor="puchun-enable-toggle" className="toggle-switch-label" />
          <label htmlFor="puchun-enable-toggle" className="special-enable-label">
            プチュン演出を有効にする
          </label>
        </div>
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
  const toBooleanFromSheetValue = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (!normalized) return false
      if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') return false
      return true
    }
    return false
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const menuCloseStartTimerRef = useRef<number | null>(null)
  const menuCloseEndTimerRef = useRef<number | null>(null)
  const clearMenuTimers = () => {
    if (menuCloseStartTimerRef.current !== null) {
      window.clearTimeout(menuCloseStartTimerRef.current)
      menuCloseStartTimerRef.current = null
    }
    if (menuCloseEndTimerRef.current !== null) {
      window.clearTimeout(menuCloseEndTimerRef.current)
      menuCloseEndTimerRef.current = null
    }
  }
  const openMenu = () => {
    clearMenuTimers()
    setIsMenuClosing(false)
    setIsMenuOpen(true)
  }
  const closeMenu = () => {
    clearMenuTimers()
    setIsMenuClosing(true)
    menuCloseStartTimerRef.current = window.setTimeout(() => {
      setIsMenuOpen(false)
      menuCloseStartTimerRef.current = null
    }, 350)
    menuCloseEndTimerRef.current = window.setTimeout(() => {
      setIsMenuClosing(false)
      menuCloseEndTimerRef.current = null
    }, 600)
  }
  useEffect(() => {
    return () => {
      clearMenuTimers()
    }
  }, [])
  const autoSaveInFlightRef = useRef(false)
  const lastAutoSavedPayloadRef = useRef('')
  const autoSaveFirstEvaluationDoneRef = useRef(false)
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
  const [isPuchunEnabled, setIsPuchunEnabled] = useState(() => {
    const saved = localStorage.getItem('isPuchunEnabled')
    return saved ? JSON.parse(saved) : true
  })
  const [isIdolLotteryEffectEnabled, setIsIdolLotteryEffectEnabled] = useState(() => {
    const saved = localStorage.getItem('isIdolLotteryEffectEnabled')
    return saved ? JSON.parse(saved) : true
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
  const [registerCheckStates, setRegisterCheckStates] = useState<{ [key: number]: boolean }>(() => {
    const saved = localStorage.getItem('registerCheckStates')
    return saved ? JSON.parse(saved) : {}
  })
  const [backupCheckStates, setBackupCheckStates] = useState<{ [key: number]: boolean }>(() => {
    const saved = localStorage.getItem('backupCheckStates')
    return saved ? JSON.parse(saved) : {}
  })
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistory[]>([])

  const buildProcessedPerformers = (performerData: Performer[]) => {
    return performerData.map((p: Performer) => {
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
  }

  const refreshPerformers = async () => {
    const response = await fetch(GAS_URL)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (Array.isArray(data.performers)) {
      setPerformers(buildProcessedPerformers(data.performers))
    } else {
      setPerformers([])
    }
  }

  const refreshIdols = async () => {
    const response = await fetch(GAS_URL)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (Array.isArray(data.idols)) {
      const refreshedIdols = data.idols.map((newItem: Idol) => {
        const parsedWinCount = Number(newItem.winCount)
        return {
          ...newItem,
          winCount: Number.isFinite(parsedWinCount) ? parsedWinCount : 0,
          prev: toBooleanFromSheetValue(newItem.lastWin),
          done: false,
        }
      })
      setIdols(refreshedIdols)
    } else {
      setIdols([])
    }
  }

  const refreshLotteryHistory = async (): Promise<LotteryHistory[]> => {
    const response = await fetch(GAS_URL)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (Array.isArray(data.lotteryHistory)) {
      setLotteryHistory(data.lotteryHistory)
      return data.lotteryHistory as LotteryHistory[]
    } else {
      setLotteryHistory([])
      return []
    }
  }

  // GAS APIからデータを取得
  useEffect(() => {
    const loadFromSpreadsheet = async () => {
      try {
        const response = await fetch(GAS_URL)
        const data = await response.json()
        console.log(data)

        // Idolsの更新処理
        if (Array.isArray(data.idols)) {
          const mergedIdols = data.idols.map((newItem: Idol) => {
            const parsedWinCount = Number(newItem.winCount)
            return {
              ...newItem,
              winCount: Number.isFinite(parsedWinCount) ? parsedWinCount : 0,
              prev: toBooleanFromSheetValue(newItem.lastWin),
              done: false,
            }
          })
          setIdols(mergedIdols)
        }

        // Performersのマージ処理と計算
        if (data.performers) {
          setPerformers(buildProcessedPerformers(data.performers))
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
    localStorage.setItem('isPuchunEnabled', JSON.stringify(isPuchunEnabled))
  }, [isPuchunEnabled])

  useEffect(() => {
    localStorage.setItem('isIdolLotteryEffectEnabled', JSON.stringify(isIdolLotteryEffectEnabled))
  }, [isIdolLotteryEffectEnabled])

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
    localStorage.setItem('registerCheckStates', JSON.stringify(registerCheckStates))
  }, [registerCheckStates])

  useEffect(() => {
    localStorage.setItem('backupCheckStates', JSON.stringify(backupCheckStates))
  }, [backupCheckStates])

  useEffect(() => {
    const isFirstEvaluation = !autoSaveFirstEvaluationDoneRef.current
    if (!autoSaveFirstEvaluationDoneRef.current) {
      autoSaveFirstEvaluationDoneRef.current = true
    }

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
      const type: '通常' | '補欠' = !isSpecialEnabled && rowNumber >= 8 ? '補欠' : '通常'

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

    if (isFirstEvaluation) {
      lastAutoSavedPayloadRef.current = payloadKey
      return
    }

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
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} selectedPureRegular={selectedPureRegular} performers={performers} lotteryTableData={lotteryTableData} setLotteryTableData={setLotteryTableData} performerLotteryTypes={performerLotteryTypes} setPerformerLotteryTypes={setPerformerLotteryTypes} idols={idols} setIdols={setIdols} idolLotteryResults={idolLotteryResults} setIdolLotteryResults={setIdolLotteryResults} setAppearanceCheckStates={setAppearanceCheckStates} setBackupCheckStates={setBackupCheckStates} volume={volume} isMuted={isMuted} isPuchunEnabled={isPuchunEnabled} isIdolLotteryEffectEnabled={isIdolLotteryEffectEnabled} />
      case 'lotteryIdol':
        return <LotteryIdolPage idols={idols} setIdols={setIdols} onRefreshIdols={refreshIdols} />
      case 'performer':
        return <PerformerPage selectedPureRegular={selectedPureRegular} setSelectedPureRegular={setSelectedPureRegular} performers={performers} setPerformers={setPerformers} onRefreshPerformers={refreshPerformers} />
      case 'appearance':
        return <AppearancePage appearanceCheckStates={appearanceCheckStates} setAppearanceCheckStates={setAppearanceCheckStates} registerCheckStates={registerCheckStates} setRegisterCheckStates={setRegisterCheckStates} lotteryHistory={lotteryHistory} onRefreshLotteryHistory={refreshLotteryHistory} />
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
            isPuchunEnabled={isPuchunEnabled}
            setIsPuchunEnabled={setIsPuchunEnabled}
            isIdolLotteryEffectEnabled={isIdolLotteryEffectEnabled}
            setIsIdolLotteryEffectEnabled={setIsIdolLotteryEffectEnabled}
          />
        )
      default:
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} selectedPureRegular={selectedPureRegular} performers={performers} lotteryTableData={lotteryTableData} setLotteryTableData={setLotteryTableData} performerLotteryTypes={performerLotteryTypes} setPerformerLotteryTypes={setPerformerLotteryTypes} idols={idols} setIdols={setIdols} idolLotteryResults={idolLotteryResults} setIdolLotteryResults={setIdolLotteryResults} setAppearanceCheckStates={setAppearanceCheckStates} setBackupCheckStates={setBackupCheckStates} volume={volume} isMuted={isMuted} isPuchunEnabled={isPuchunEnabled} isIdolLotteryEffectEnabled={isIdolLotteryEffectEnabled} />
    }
  }

  return (
    <main id="tab-view" className={activeTab === 'lottery' ? 'lottery-active' : ''}>
      {!isMenuOpen && !isMenuClosing && (
        <button
          className="hamburger-btn"
          type="button"
          aria-label="メニューを開く"
          aria-expanded={isMenuOpen}
          onClick={openMenu}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      )}

      {(isMenuOpen || isMenuClosing) && (
        <div className="drawer-overlay" onClick={closeMenu} />
      )}

      <nav
        className={`drawer-nav${isMenuOpen ? ' drawer-nav-open' : ''}${isMenuClosing ? ' drawer-nav-closing' : ''}`}
        aria-label="メインタブ"
      >
        <div className="drawer-header">
          <span className="drawer-title">メニュー</span>
          <button
            className="drawer-close-btn"
            type="button"
            aria-label="メニューを閉じる"
            onClick={closeMenu}
          >
            ✕
          </button>
        </div>
        <div className="drawer-tabs-body">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'drawer-tab drawer-tab-active' : 'drawer-tab'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <div className="drawer-volume-section">
            <div className="drawer-volume-row">
              <span className="drawer-volume-icon">{isMuted ? '🔇' : volume === 0 ? '🔇' : volume <= 33 ? '🔈' : volume <= 66 ? '🔉' : '🔊'}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="drawer-volume-slider"
                style={{ background: `linear-gradient(to right, #27ae60 ${volume}%, rgba(0,0,0,0.15) ${volume}%)` }}
              />
            </div>
            <button
              type="button"
              className={`drawer-mute-btn${isMuted ? ' drawer-mute-active' : ''}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? 'ミュート中' : 'ミュート'}
            </button>
          </div>
        </div>
      </nav>

      <div className="tab-content active">{renderPage()}</div>
    </main>
  )
}

export default App