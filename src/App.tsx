import { useState } from 'react'
import './App.css'

type TabKey = 'lottery' | 'lotteryIdol' | 'performer' | 'appearance' | 'settings'

function LotteryPage({ volCount, isSpecialEnabled, specialVolText, specialPerformerCount }: { volCount: number; isSpecialEnabled: boolean; specialVolText: string; specialPerformerCount: number }) {
  const logoPath = `${import.meta.env.BASE_URL}etc/NewP_Parade_logo.png`

  const renderLotteryTable = () => {
    if (isSpecialEnabled) {
      return (
        <div id="lottery-container">
          <table id="lottery-table" className="main-lottery">
            <tbody>
              {Array.from({ length: specialPerformerCount }).map((_, i) => (
                <tr key={i} className="row-regular">
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    } else {
      return (
        <div id="lottery-container">
          <table id="lottery-table" className="main-lottery">
            <tbody>
              {Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className={i === 0 ? 'row-semi-regular' : 'row-regular'}>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ marginTop: '10px', marginLeft: '12px', marginBottom: '0' }}>補欠枠</h4>

          <table id="lottery-table" className="backup-lottery">
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="row-backup">
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }

  return (
    <section className="tab-page">
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
        <button id="btn-lot-confirmed" className="lot-btn">確定当選</button>
        <button id="btn-lot-priority" className="lot-btn">優先抽選</button>
        <button id="btn-lot-regular" className="lot-btn">通常抽選</button>
        <button id="clear-lottery" className="lot-btn">結果リセット</button>
      </div>
      {renderLotteryTable()}
    </section>
  )
}

function LotteryIdolPage() {
  return <section className="tab-page other-tab-page" />
}

function PerformerPage() {
  return <section className="tab-page other-tab-page" />
}

function AppearancePage() {
  return <section className="tab-page other-tab-page" />
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
  const [volCount, setVolCount] = useState(0)
  const [isSpecialEnabled, setIsSpecialEnabled] = useState(false)
  const [specialVolText, setSpecialVolText] = useState('')
  const [specialPerformerCount, setSpecialPerformerCount] = useState(0)
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)

  const renderPage = () => {
    switch (activeTab) {
      case 'lottery':
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} />
      case 'lotteryIdol':
        return <LotteryIdolPage />
      case 'performer':
        return <PerformerPage />
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
        return <LotteryPage volCount={volCount} isSpecialEnabled={isSpecialEnabled} specialVolText={specialVolText} specialPerformerCount={specialPerformerCount} />
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
