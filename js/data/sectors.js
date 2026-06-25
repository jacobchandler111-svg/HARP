// Sector reference data — the "data seam" (see docs/ARCHITECTURE.md). Today it bundles a curated map of
// the largest, most commonly-held NYSE/NASDAQ names -> GICS sector (+ company name). It is intentionally
// large-cap-focused, not every listed ticker; a live market-data source (behind a backend proxy) can later
// replace ONLY this file. Callers use HARP.sectors.lookup(tickerOrName) and HARP.sectors.nameOf(ticker).
window.HARP = window.HARP || {};

HARP.sectors = (function () {
  // [ticker, company name, sector]. One source of truth; the lookup maps are built from it below.
  var DATA = [
    // Technology
    ['AAPL','Apple Inc.','Technology'], ['MSFT','Microsoft Corp.','Technology'], ['NVDA','NVIDIA Corp.','Technology'],
    ['AVGO','Broadcom Inc.','Technology'], ['ORCL','Oracle Corp.','Technology'], ['CRM','Salesforce Inc.','Technology'],
    ['ADBE','Adobe Inc.','Technology'], ['AMD','Advanced Micro Devices','Technology'], ['INTC','Intel Corp.','Technology'],
    ['CSCO','Cisco Systems','Technology'], ['QCOM','Qualcomm Inc.','Technology'], ['TXN','Texas Instruments','Technology'],
    ['IBM','IBM','Technology'], ['NOW','ServiceNow Inc.','Technology'], ['INTU','Intuit Inc.','Technology'],
    ['AMAT','Applied Materials','Technology'], ['MU','Micron Technology','Technology'], ['LRCX','Lam Research','Technology'],
    ['ADI','Analog Devices','Technology'], ['PANW','Palo Alto Networks','Technology'], ['SNPS','Synopsys Inc.','Technology'],
    ['CDNS','Cadence Design','Technology'], ['KLAC','KLA Corp.','Technology'], ['ANET','Arista Networks','Technology'],
    ['PLTR','Palantir Technologies','Technology'], ['CRWD','CrowdStrike Holdings','Technology'], ['DELL','Dell Technologies','Technology'],
    ['HPQ','HP Inc.','Technology'], ['SMCI','Super Micro Computer','Technology'], ['MRVL','Marvell Technology','Technology'],

    // Communication Services
    ['GOOGL','Alphabet Inc.','Communication Services'], ['GOOG','Alphabet Inc.','Communication Services'],
    ['META','Meta Platforms','Communication Services'], ['NFLX','Netflix Inc.','Communication Services'],
    ['DIS','Walt Disney Co.','Communication Services'], ['CMCSA','Comcast Corp.','Communication Services'],
    ['T','AT&T Inc.','Communication Services'], ['VZ','Verizon Communications','Communication Services'],
    ['TMUS','T-Mobile US','Communication Services'], ['CHTR','Charter Communications','Communication Services'],
    ['EA','Electronic Arts','Communication Services'], ['TTWO','Take-Two Interactive','Communication Services'],
    ['WBD','Warner Bros. Discovery','Communication Services'], ['OMC','Omnicom Group','Communication Services'],

    // Consumer Discretionary
    ['AMZN','Amazon.com Inc.','Consumer Discretionary'], ['TSLA','Tesla Inc.','Consumer Discretionary'],
    ['HD','Home Depot','Consumer Discretionary'], ['MCD',"McDonald's Corp.",'Consumer Discretionary'],
    ['NKE','Nike Inc.','Consumer Discretionary'], ['LOW',"Lowe's Companies",'Consumer Discretionary'],
    ['SBUX','Starbucks Corp.','Consumer Discretionary'], ['BKNG','Booking Holdings','Consumer Discretionary'],
    ['TJX','TJX Companies','Consumer Discretionary'], ['ORLY',"O'Reilly Automotive",'Consumer Discretionary'],
    ['CMG','Chipotle Mexican Grill','Consumer Discretionary'], ['MAR','Marriott International','Consumer Discretionary'],
    ['GM','General Motors','Consumer Discretionary'], ['F','Ford Motor Co.','Consumer Discretionary'],
    ['ABNB','Airbnb Inc.','Consumer Discretionary'], ['LULU','Lululemon Athletica','Consumer Discretionary'],
    ['RCL','Royal Caribbean Cruises','Consumer Discretionary'], ['DHI','D.R. Horton','Consumer Discretionary'],
    ['AZO','AutoZone Inc.','Consumer Discretionary'], ['ROST','Ross Stores','Consumer Discretionary'],

    // Consumer Staples
    ['PG','Procter & Gamble','Consumer Staples'], ['KO','Coca-Cola Co.','Consumer Staples'],
    ['PEP','PepsiCo Inc.','Consumer Staples'], ['WMT','Walmart Inc.','Consumer Staples'],
    ['COST','Costco Wholesale','Consumer Staples'], ['MDLZ','Mondelez International','Consumer Staples'],
    ['PM','Philip Morris International','Consumer Staples'], ['MO','Altria Group','Consumer Staples'],
    ['CL','Colgate-Palmolive','Consumer Staples'], ['TGT','Target Corp.','Consumer Staples'],
    ['KMB','Kimberly-Clark','Consumer Staples'], ['GIS','General Mills','Consumer Staples'],
    ['KHC','Kraft Heinz','Consumer Staples'], ['STZ','Constellation Brands','Consumer Staples'],
    ['KDP','Keurig Dr Pepper','Consumer Staples'], ['KR','Kroger Co.','Consumer Staples'],
    ['CELH','Celsius Holdings','Consumer Staples'], ['MNST','Monster Beverage','Consumer Staples'],

    // Health Care
    ['UNH','UnitedHealth Group','Health Care'], ['JNJ','Johnson & Johnson','Health Care'],
    ['LLY','Eli Lilly & Co.','Health Care'], ['ABBV','AbbVie Inc.','Health Care'],
    ['MRK','Merck & Co.','Health Care'], ['PFE','Pfizer Inc.','Health Care'],
    ['TMO','Thermo Fisher Scientific','Health Care'], ['ABT','Abbott Laboratories','Health Care'],
    ['DHR','Danaher Corp.','Health Care'], ['AMGN','Amgen Inc.','Health Care'],
    ['BMY','Bristol-Myers Squibb','Health Care'], ['GILD','Gilead Sciences','Health Care'],
    ['CVS','CVS Health','Health Care'], ['MDT','Medtronic plc','Health Care'],
    ['ISRG','Intuitive Surgical','Health Care'], ['VRTX','Vertex Pharmaceuticals','Health Care'],
    ['REGN','Regeneron Pharmaceuticals','Health Care'], ['ELV','Elevance Health','Health Care'],
    ['CI','Cigna Group','Health Care'], ['ZTS','Zoetis Inc.','Health Care'],
    ['BSX','Boston Scientific','Health Care'], ['HCA','HCA Healthcare','Health Care'], ['MRNA','Moderna Inc.','Health Care'],

    // Financials
    ['BRK.B','Berkshire Hathaway','Financials'], ['JPM','JPMorgan Chase','Financials'],
    ['V','Visa Inc.','Financials'], ['MA','Mastercard Inc.','Financials'],
    ['BAC','Bank of America','Financials'], ['WFC','Wells Fargo','Financials'],
    ['GS','Goldman Sachs','Financials'], ['MS','Morgan Stanley','Financials'],
    ['AXP','American Express','Financials'], ['SCHW','Charles Schwab','Financials'],
    ['C','Citigroup Inc.','Financials'], ['BLK','BlackRock Inc.','Financials'],
    ['SPGI','S&P Global','Financials'], ['CB','Chubb Ltd.','Financials'],
    ['PGR','Progressive Corp.','Financials'], ['MMC','Marsh & McLennan','Financials'],
    ['PYPL','PayPal Holdings','Financials'], ['COF','Capital One Financial','Financials'],
    ['USB','U.S. Bancorp','Financials'], ['PNC','PNC Financial Services','Financials'],
    ['AON','Aon plc','Financials'], ['ICE','Intercontinental Exchange','Financials'],

    // Energy
    ['XOM','Exxon Mobil','Energy'], ['CVX','Chevron Corp.','Energy'], ['COP','ConocoPhillips','Energy'],
    ['SLB','Schlumberger','Energy'], ['EOG','EOG Resources','Energy'], ['MPC','Marathon Petroleum','Energy'],
    ['PSX','Phillips 66','Energy'], ['VLO','Valero Energy','Energy'], ['OXY','Occidental Petroleum','Energy'],
    ['WMB','Williams Companies','Energy'], ['KMI','Kinder Morgan','Energy'], ['HAL','Halliburton','Energy'],
    ['DVN','Devon Energy','Energy'], ['HES','Hess Corp.','Energy'],

    // Industrials
    ['GE','GE Aerospace','Industrials'], ['CAT','Caterpillar Inc.','Industrials'], ['RTX','RTX Corp.','Industrials'],
    ['HON','Honeywell International','Industrials'], ['UNP','Union Pacific','Industrials'], ['BA','Boeing Co.','Industrials'],
    ['LMT','Lockheed Martin','Industrials'], ['DE','Deere & Co.','Industrials'], ['UPS','United Parcel Service','Industrials'],
    ['ETN','Eaton Corp.','Industrials'], ['GD','General Dynamics','Industrials'], ['NOC','Northrop Grumman','Industrials'],
    ['MMM','3M Co.','Industrials'], ['EMR','Emerson Electric','Industrials'], ['ITW','Illinois Tool Works','Industrials'],
    ['CSX','CSX Corp.','Industrials'], ['FDX','FedEx Corp.','Industrials'], ['NSC','Norfolk Southern','Industrials'],
    ['WM','Waste Management','Industrials'], ['PH','Parker-Hannifin','Industrials'],

    // Materials
    ['LIN','Linde plc','Materials'], ['SHW','Sherwin-Williams','Materials'], ['APD','Air Products & Chemicals','Materials'],
    ['FCX','Freeport-McMoRan','Materials'], ['ECL','Ecolab Inc.','Materials'], ['NEM','Newmont Corp.','Materials'],
    ['DOW','Dow Inc.','Materials'], ['DD','DuPont de Nemours','Materials'], ['NUE','Nucor Corp.','Materials'], ['PPG','PPG Industries','Materials'],

    // Utilities
    ['NEE','NextEra Energy','Utilities'], ['DUK','Duke Energy','Utilities'], ['SO','Southern Co.','Utilities'],
    ['D','Dominion Energy','Utilities'], ['AEP','American Electric Power','Utilities'], ['EXC','Exelon Corp.','Utilities'],
    ['SRE','Sempra','Utilities'], ['XEL','Xcel Energy','Utilities'], ['ED','Consolidated Edison','Utilities'], ['PEG','Public Service Enterprise','Utilities'],

    // Real Estate
    ['PLD','Prologis Inc.','Real Estate'], ['AMT','American Tower','Real Estate'], ['EQIX','Equinix Inc.','Real Estate'],
    ['CCI','Crown Castle','Real Estate'], ['PSA','Public Storage','Real Estate'], ['O','Realty Income','Real Estate'],
    ['SPG','Simon Property Group','Real Estate'], ['WELL','Welltower Inc.','Real Estate'], ['DLR','Digital Realty Trust','Real Estate'], ['VICI','VICI Properties','Real Estate'],

    // Diversified / Fund (ETFs & index funds)
    ['SPY','SPDR S&P 500 ETF','Diversified / Fund'], ['VOO','Vanguard S&P 500 ETF','Diversified / Fund'],
    ['IVV','iShares Core S&P 500 ETF','Diversified / Fund'], ['VTI','Vanguard Total Stock Market ETF','Diversified / Fund'],
    ['QQQ','Invesco QQQ Trust','Diversified / Fund'], ['DIA','SPDR Dow Jones ETF','Diversified / Fund'],
    ['IWM','iShares Russell 2000 ETF','Diversified / Fund'], ['VEA','Vanguard Developed Markets ETF','Diversified / Fund'],
    ['VWO','Vanguard Emerging Markets ETF','Diversified / Fund'], ['SCHD','Schwab US Dividend Equity ETF','Diversified / Fund'],
    ['VUG','Vanguard Growth ETF','Diversified / Fund'], ['VTV','Vanguard Value ETF','Diversified / Fund'],
    ['BND','Vanguard Total Bond Market ETF','Diversified / Fund'], ['AGG','iShares Core US Aggregate Bond ETF','Diversified / Fund']
  ];

  // Canonical sector list (GICS-style, simplified). Drives dropdowns and exposure grouping.
  var list = [
    'Technology', 'Financials', 'Health Care', 'Consumer Discretionary', 'Consumer Staples',
    'Energy', 'Industrials', 'Materials', 'Utilities', 'Real Estate', 'Communication Services',
    'Diversified / Fund', 'Cash & Equivalents', 'Other'
  ];

  function normTicker(t) { return String(t == null ? '' : t).trim().toUpperCase().replace(/[.\-]/g, '_'); }

  // Build the lookup maps from DATA.
  var byTicker = {}, names = {}, byName = {};
  DATA.forEach(function (row) {
    var key = normTicker(row[0]);
    byTicker[key] = row[2];
    names[key] = row[1];
    byName[row[1].trim().toLowerCase()] = row[2];
  });

  return {
    list: list,
    byTicker: byTicker,
    names: names,

    // Sector for a ticker OR a company name; normalizes case and . / - separators. Null if unknown.
    lookup: function (q) {
      if (!q) return null;
      var byT = byTicker[normTicker(q)];
      if (byT) return byT;
      return byName[String(q).trim().toLowerCase()] || null;
    },

    // Company name for a ticker (e.g. AAPL -> "Apple Inc."). Null if unknown.
    nameOf: function (ticker) {
      if (!ticker) return null;
      return names[normTicker(ticker)] || null;
    }
  };
})();
