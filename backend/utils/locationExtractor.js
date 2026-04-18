const COUNTRY_MAP = {
  'india':         'India',
  'indian':        'India',
  'china':         'China',
  'chinese':       'China',
  'usa':           'United States',
  'us':            'United States',
  'united states': 'United States',
  'america':       'United States',
  'american':      'United States',
  'uk':            'United Kingdom',
  'united kingdom':'United Kingdom',
  'britain':       'United Kingdom',
  'british':       'United Kingdom',
  'canada':        'Canada',
  'canadian':      'Canada',
  'australia':     'Australia',
  'australian':    'Australia',
  'germany':       'Germany',
  'german':        'Germany',
  'france':        'France',
  'french':        'France',
  'japan':         'Japan',
  'japanese':      'Japan',
  'brazil':        'Brazil',
  'brazil':        'Brazil',
  'europe':        'Europe',
  'european':      'Europe',
  'asia':          'Asia',
  'asian':         'Asia',
};

const LOCATION_RE = /\b(?:in|available in|trials in|conducted in|based in|located in|near)\s+(the\s+)?([a-zA-Z\s]{2,25}?)(?=\s|$|[,.])/i;

export function extractLocationFromQuery(query) {
  if (!query) return null;
  const q = query.toLowerCase();

  const match = q.match(LOCATION_RE);
  if (match) {
    const candidate = match[2].trim().toLowerCase();
    if (COUNTRY_MAP[candidate]) return COUNTRY_MAP[candidate];
  }

  for (const [token, canonical] of Object.entries(COUNTRY_MAP)) {

    const tokenRe = new RegExp(`\\b${token}\\b`, 'i');
    if (tokenRe.test(q)) return canonical;
  }

  return null;
}
