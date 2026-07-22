# PRD – Krypto Daytrading Website (Krypto_Alert)

## Original-Problem (User)
Bestehende, funktionierende Daytrading-Website (GitHub dean06greif-ai/Krypto_Alert, Branch New-Patch-21.07) verbessern:
Glaubwürdigkeit der Statistiken (Hebel/Liquidation, Break-Even, Discovery-Strategien, Parameter-Wirkung), RAM-Verbesserungen,
Fast-Path-Migration restlicher Built-in-Strategien, Kerzen-Cache-Reset, Optimizer-Geister-Job-Bug, Coin-Laden beschleunigen,
Backtest→Live/Paper-Übernahme, getrennte SL/TP-Modi, BE-Dropdown-Bug, Gewinnsicherung/BE als Strategie-Parameter,
Strategie-Einstellungen als Datei exportieren/importieren, vollständige Konsistenz-Verifikation Backtester vs. Paper/Live.

## Architektur
- Backend: FastAPI (server.py) + services/ (backtester, fast_sim, candle_cache, optimizer, bitunix_trade, market_data) + strategies/
- Frontend: React (Backtester.js, Optimizer.js, StrategyAutoTradeModal.js, StrategyBuilder.js …)
- DB: MongoDB (auto_trades, strategy_coin_configs, backtests, optimizer_runs, settings)
- Marktdaten: Binance Public API (1m-Kerzen, Hybrid-Cache RAM+Disk), Trading: Bitunix (live optional)
- Admin-Login: user=Admin / password=admin (Defaults)

## Umgesetzt (2026-06, dieser Durchgang)
1. Fast-Path für bollinger_reversion, bollinger_squeeze, ema_pullback_scalping (vectorized_signals inkl. Pre-Signale,
   Sweep-Vektorisierung in fast_sim). ict_liquidity_sweep bewusst Legacy (dokumentierter Fallback). Parität verifiziert
   (identische Trades/PnL), Speedups 129x–1231x. Report: /app/VERIFICATION_REPORT.md
2. Liquidationslogik (Isolated Margin, MMR 0.5% konfigurierbar) + Margen-Deckel in Backtester UND Paper/Live-Monitor;
   „Liq."-Spalte im Backtest-Ranking, liquidated-Flag im CSV-Export.
3. Break-Even-Modi verifiziert (crv/profit_pct/smart/tp1/off wirken unterschiedlich; profit_pct-Trigger auf 1m selten erreicht – dokumentiert).
4. Discovery/Custom-Timeframe-Bug behoben (STRATEGY_TIMEFRAME aus Definition; TF wirkt nachweislich: 275/95/36 Trades bei 1m/5m/15m).
5. Optimizer-Geister-Job: active-Check beim Öffnen, Notfall-Reset (POST /api/optimizer/reset, /api/backtest/reset), Ghost-Task-Watchdog.
6. RAM: GET /api/system/ram (Bewertung), POST /api/system/cache/clear, Fast-Path-Schalter (use_fast_path) + Toolbar im Backtester.
7. Coin-Laden ~3x schneller (paralleles Chunk-Fetching in candle_cache).
8. Backtest→Trading: POST /api/backtest/apply + „→ Trading"-Button (Coin- & Modus-Auswahl) im Ergebnis.
9. TP-Modi getrennt (crv | fixed_pct | structure) + SL-Modi (structure | atr | fixed) in Backtester & StrategyAutoTradeModal.
10. BE-Dropdown-CSS-Fix (dunkles Select statt weiß).
11. Gewinnsicherung/BE/TP-Modus pro Strategie im Backtester-⚙-Panel testbar.
12. Export/Import von Einstellungen als JSON-Datei (Backtester-Toolbar + StrategyAutoTradeModal).

## Antworten auf User-Fragen (Details in /app/VERIFICATION_REPORT.md)
- Mehrere Trades pro Coin: Backtester 1/(Strategie,Coin); Live/Paper 1/Coin gesamt.
- 100x-Hebel = 10x-Multiplikation: war korrekt beobachtet, Liquidation fehlte → jetzt implementiert.
- BE macht kaum Unterschied: Modi korrekt, profit_pct-Trigger für Scalping zu hoch → niedriger einstellen.

## Backlog / Nächste Schritte
- P1: ict_liquidity_sweep-Vektorisierung (falls gewünscht, mit Paritätstest)
- P1: server.py modularisieren (>2400 Zeilen)
- P2: <span> in <option> Hydration-Warning bereinigen; Toast-Dauer Cache-Clear verlängern
- P2: Bestätigungs-Flag für mode=live in /api/backtest/apply (API-seitig)
- P2: Kerzen-Cache auf numpy-Arrays umstellen (~10x weniger RAM, größerer Umbau)

## Test-Status
- /app/test_reports/iteration_3.json: Backend 11/11, Frontend 100% (2026-06)
- /app/test_reports/verify_consistency.json + /app/backend/tests/verify_consistency.py (Konsistenz-Läufe)
