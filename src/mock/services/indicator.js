const previewUser = {
  id: 1,
  username: 'admin',
  nickname: 'Preview Admin',
  avatar: '/avatar2.jpg',
  is_demo: true,
  must_change_initial_password: false,
  role: {
    id: 'admin',
    permissionList: ['dashboard']
  }
}

const previewIndicators = [
  {
    id: 9001,
    userid: 1,
    name: 'Preview Backtest Strategy',
    description: 'Mock strategy for frontend-only backtest review UI validation.',
    code: [
      "my_indicator_name = 'Preview Backtest Strategy'",
      "my_indicator_description = 'Frontend preview fixture'",
      '# @strategy tradeDirection both',
      '# @strategy stopLossPct 2.5',
      '# @strategy takeProfitPct 4.0',
      "fast_ma = df['close'].rolling(window=12).mean()",
      "slow_ma = df['close'].rolling(window=36).mean()",
      "range_ma = (df['high'] - df['low']).rolling(window=14).mean()",
      "range_stop = df['close'] - range_ma",
      "df['open_long'] = False",
      "df['close_long'] = False",
      "df['open_short'] = False",
      "df['close_short'] = False",
      'output = {',
      "  'name': my_indicator_name,",
      "  'plots': [",
      "    {'name': 'MA12', 'data': fast_ma.where(fast_ma.notna(), None).tolist(), 'color': '#22c55e', 'overlay': True},",
      "    {'name': 'MA36', 'data': slow_ma.where(slow_ma.notna(), None).tolist(), 'color': '#f59e0b', 'overlay': True},",
      "    {'name': 'Range Stop', 'data': range_stop.where(range_stop.notna(), None).tolist(), 'color': '#60a5fa', 'overlay': True},",
      '  ],',
      "  'signals': [],",
      '}'
    ].join('\n'),
    language: 'python',
    publish_to_community: false,
    pricing_type: 'free'
  }
]

const startTime = Date.UTC(2026, 0, 2, 0, 0, 0)
const hourMs = 60 * 60 * 1000
const klineData = Array.from({ length: 240 }, (_, index) => {
  const drift = index * 12
  const wave = Math.sin(index / 8) * 180
  const base = 42000 + drift + wave
  const open = base + Math.sin(index / 3) * 45
  const close = base + Math.cos(index / 5) * 58
  const high = Math.max(open, close) + 120 + (index % 7) * 8
  const low = Math.min(open, close) - 120 - (index % 5) * 9
  return {
    timestamp: startTime + index * hourMs,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: Number((1200 + (index % 24) * 38 + Math.abs(Math.sin(index / 6)) * 500).toFixed(2))
  }
})

const lastKline = klineData[klineData.length - 1]
const prevKline = klineData[klineData.length - 2]
if (lastKline && prevKline) {
  const open = prevKline.close
  const close = open + 6.8
  Object.assign(lastKline, {
    open: Number(open.toFixed(2)),
    high: Number((Math.max(open, close) + 18).toFixed(2)),
    low: Number((Math.min(open, close) - 16).toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: Number((prevKline.volume * 0.35).toFixed(2))
  })
}

const realtimeKline = lastKline
  ? {
      timestamp: lastKline.timestamp + hourMs,
      open: lastKline.close,
      high: Number((lastKline.close + 16).toFixed(2)),
      low: Number((lastKline.close - 12).toFixed(2)),
      close: Number((lastKline.close + 4.2).toFixed(2)),
      volume: Number((lastKline.volume * 0.28).toFixed(2))
    }
  : null

function klineAt (index) {
  return klineData[Math.max(0, Math.min(klineData.length - 1, index))]
}

const tradePairs = [
  { entry: 28, exit: 42, side: 'long', profit: 318.45, reason: 'take_profit' },
  { entry: 61, exit: 78, side: 'short', profit: -126.82, reason: 'stop_loss' },
  { entry: 95, exit: 119, side: 'long', profit: 512.3, reason: 'signal' },
  { entry: 133, exit: 151, side: 'short', profit: 244.18, reason: 'trailing_stop' },
  { entry: 166, exit: 183, side: 'long', profit: -288.64, reason: 'stop_loss' },
  { entry: 198, exit: 226, side: 'long', profit: 672.91, reason: 'take_profit' }
]

let balance = 10000
const trades = tradePairs.flatMap((pair, index) => {
  const entryBar = klineAt(pair.entry)
  const exitBar = klineAt(pair.exit)
  balance += pair.profit
  const openType = pair.side === 'short' ? 'open_short' : 'open_long'
  const closeType = pair.side === 'short' ? 'close_short' : 'close_long'
  return [
    {
      id: index * 2 + 1,
      time: entryBar.timestamp,
      type: openType,
      price: entryBar.close,
      quantity: 0.12 + index * 0.015,
      balance: Number((balance - pair.profit).toFixed(2))
    },
    {
      id: index * 2 + 2,
      time: exitBar.timestamp,
      type: closeType,
      reason: pair.reason,
      close_reason: pair.reason,
      price: exitBar.close,
      quantity: 0.12 + index * 0.015,
      profit: pair.profit,
      balance: Number(balance.toFixed(2))
    }
  ]
})

const equityCurve = klineData.slice(20, 236).map((bar, index) => {
  const tradeEffect = trades
    .filter(trade => trade.profit && trade.time <= bar.timestamp)
    .reduce((sum, trade) => sum + trade.profit, 0)
  const mark = 10000 + tradeEffect + index * 4 + Math.sin(index / 9) * 80
  return {
    time: bar.timestamp,
    value: Number(mark.toFixed(2))
  }
})

const benchmarkStart = klineAt(20).close
const benchmarkCurve = klineData.slice(20, 236).map(bar => ({
  time: bar.timestamp,
  value: Number((10000 * (bar.close / benchmarkStart)).toFixed(2))
}))

function rollingAverage (values, period) {
  return values.map((_, index) => {
    if (index + 1 < period) return null
    const window = values.slice(index + 1 - period, index + 1)
    const average = window.reduce((sum, value) => sum + value, 0) / period
    return Number(average.toFixed(2))
  })
}

const previewPlots = [
  {
    name: 'MA12',
    data: rollingAverage(klineData.map(bar => bar.close), 12),
    color: '#22c55e',
    overlay: true
  },
  {
    name: 'MA36',
    data: rollingAverage(klineData.map(bar => bar.close), 36),
    color: '#f59e0b',
    overlay: true
  },
  {
    name: 'Range Stop',
    data: rollingAverage(klineData.map(bar => bar.high - bar.low), 14).map((range, index) => {
      if (range == null) return null
      return Number((klineData[index].close - range).toFixed(2))
    }),
    color: '#60a5fa',
    overlay: true
  }
]

const backtestResult = {
  totalReturn: 13.34,
  benchmarkReturn: 7.62,
  alphaReturn: 5.72,
  maxDrawdown: -6.48,
  sharpeRatio: 1.42,
  winRate: 66.67,
  profitFactor: 1.86,
  totalTrades: tradePairs.length,
  finalBalance: Number(balance.toFixed(2)),
  equityCurve,
  benchmarkCurve,
  plots: previewPlots,
  trades,
  qualityChecks: [
    { key: 'fee', title: '手续费已计入', status: 'PASS', detail: 'Mock run uses commission from the backtest form.' },
    { key: 'slippage', title: '滑点已计入', status: 'PASS', detail: 'Mock run uses slippage from the backtest form.' },
    { key: 'lookahead', title: '未来函数检查', status: 'PASS', detail: 'Preview fixture is deterministic and display-only.' },
    { key: 'sample', title: '交易样本数量', status: 'WARN', detail: 'Preview fixture intentionally keeps a small trade sample for UI testing.' }
  ],
  configSnapshot: {
    indicatorId: 9001,
    market: 'Crypto',
    symbol: 'BTC/USDT',
    timeframe: '1H'
  }
}

const ok = data => ({ code: 1, data, msg: '' })

export default [
  {
    url: '/api/auth/security-config',
    method: 'get',
    response: () => ok({
      turnstile_enabled: false,
      oauth: {}
    })
  },
  {
    url: '/api/auth/login',
    method: 'post',
    response: () => ok({
      token: 'preview-token',
      userinfo: previewUser
    })
  },
  {
    url: '/api/auth/info',
    method: 'get',
    response: () => ok(previewUser)
  },
  {
    url: '/api/settings/brand-config',
    method: 'get',
    response: () => ok({
      app_name: 'QuantDinger',
      app_version: 'preview',
      copyright: 'Copyright 2025-2026 QuantDinger. All rights reserved.',
      logos: { light: '', dark: '', collapsed: '', favicon: '' },
      contact: {},
      social_accounts: [],
      legal: {},
      mobile_app: {}
    })
  },
  {
    url: '/api/policy/broker-market',
    method: 'get',
    response: () => ok({
      broker_markets: {
        binance: { Crypto: ['spot', 'swap'] },
        alpaca: { USStock: ['spot'], Crypto: ['spot'] }
      },
      long_only_brokers: ['alpaca'],
      bot_type_markets: {
        grid: ['Crypto'],
        martingale: ['Crypto'],
        dca: ['Crypto'],
        trend: ['Crypto']
      },
      live_market_categories: ['Crypto', 'USStock']
    })
  },
  {
    url: '/api/market/watchlist/get',
    method: 'get',
    response: () => ok([
      { id: 1, market: 'Crypto', symbol: 'BTC/USDT', label: 'BTC/USDT' },
      { id: 2, market: 'Crypto', symbol: 'ETH/USDT', label: 'ETH/USDT' }
    ])
  },
  {
    url: '/api/market/watchlist/prices',
    method: 'get',
    response: () => ok({
      'Crypto:BTC/USDT': { price: 42850.25, changePct: 1.24 },
      'Crypto:ETH/USDT': { price: 3180.4, changePct: -0.42 }
    })
  },
  {
    url: '/api/market/price',
    method: 'get',
    response: () => ok({ price: 42850.25, changePct: 1.24 })
  },
  {
    url: '/api/market-modules',
    method: 'get',
    response: () => ok([
      { key: 'Crypto', label: 'Crypto', enabled: true, features: ['research', 'backtest', 'paper', 'live'] },
      { key: 'USStock', label: 'US Stocks', enabled: true, features: ['research', 'backtest', 'paper', 'live'] },
      { key: 'Forex', label: 'Forex', enabled: true, features: ['research', 'backtest', 'paper', 'live'] }
    ])
  },
  {
    url: '/api/settings/public-config',
    method: 'get',
    response: () => ok({ exchange: 'binance' })
  },
  {
    url: '/api/portfolio/positions',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/portfolio/monitors',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/billing/plans',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/strategies/notifications/unread-count',
    method: 'get',
    response: () => ok({ count: 0 })
  },
  {
    url: '/api/ai/chat/sessions',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/ai/agent/preflight',
    method: 'get',
    response: () => ok({ available: false })
  },
  {
    url: '/api/ai/skills',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/ai/memory',
    method: 'get',
    response: () => ok({})
  },
  {
    url: '/api/global-market/calendar',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/credentials/list',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/quick-trade/history',
    method: 'get',
    response: () => ok([])
  },
  {
    url: '/api/indicator/getIndicators',
    method: 'get',
    response: () => ok(previewIndicators)
  },
  {
    url: '/api/indicator/kline',
    method: 'get',
    response: ({ query }) => {
      const limit = Number(query && query.limit)
      if (Number.isFinite(limit) && limit > 0 && limit <= 3 && realtimeKline) {
        return ok(limit === 1 ? [realtimeKline] : [...klineData.slice(-(limit - 1)), realtimeKline])
      }
      if (Number.isFinite(limit) && limit > 0) {
        return ok(klineData.slice(-limit))
      }
      return ok(klineData)
    }
  },
  {
    url: '/api/indicator/backtest',
    method: 'post',
    response: ({ body }) => {
      const payload = body || {}
      return ok({
        runId: 'preview-backtest-run',
        result: {
          ...backtestResult,
          configSnapshot: {
            ...backtestResult.configSnapshot,
            market: payload.market || backtestResult.configSnapshot.market,
            symbol: payload.symbol || backtestResult.configSnapshot.symbol,
            timeframe: payload.timeframe || backtestResult.configSnapshot.timeframe
          }
        }
      })
    }
  }
]
