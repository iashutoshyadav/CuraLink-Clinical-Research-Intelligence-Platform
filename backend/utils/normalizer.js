function stripHtml(str) {
  return (str || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x2019;|&#8217;|&#x2018;|&#8216;|&#39;|&apos;/g, "'")
    .replace(/&#x201C;|&#8220;|&#x201D;|&#8221;/g, '"')
    .replace(/&#x2013;|&#8211;/g, '\u2013')
    .replace(/&#x2014;|&#8212;/g, '\u2014')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x?\w+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeOpenAlexWork(work) {
  const year = String(work?.publication_year ?? work?.publication_date?.slice(0, 4) ?? '');

  const authors = (work?.authorships ?? [])
    .slice(0, 5)
    .map((a) => a?.author?.display_name ?? '')
    .filter(Boolean);

  const journal =
    work?.primary_location?.source?.display_name ??
    work?.host_venue?.display_name ??
    '';

  const doi = work?.doi?.replace('https://doi.org/', '') ?? '';
  const url =
    work?.primary_location?.landing_page_url ??
    (doi ? `https://doi.org/${doi}` : '') ??
    work?.id ??
    '';

  const abstract = invertAbstractIndex(work?.abstract_inverted_index);

  return {
    id:           `openalex_${work.id?.split('/').pop() ?? Math.random()}`,
    title:        stripHtml(work?.title ?? 'Untitled'),
    abstract:     stripHtml(abstract),
    authors,
    year,
    source:       'OpenAlex',
    journal,
    url:          url || work?.id || '',
    citationCount: work?.cited_by_count ?? 0,
  };
}

export function invertAbstractIndex(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  try {
    const positions = [];
    for (const [word, posArr] of Object.entries(invertedIndex)) {
      for (const pos of posArr) positions.push({ pos, word });
    }
    return positions.sort((a, b) => a.pos - b.pos).map((p) => p.word).join(' ');
  } catch {
    return '';
  }
}

export function normalizeTrial(study) {
  const proto      = study?.protocolSection ?? {};
  const id         = proto?.identificationModule;
  const status     = proto?.statusModule;
  const eligibility = proto?.eligibilityModule;
  const contacts   = proto?.contactsLocationsModule;
  const design     = proto?.designModule;

  const nctId = id?.nctId ?? '';

  const locations = contacts?.locations ?? [];
  const locationStr = locations
    .slice(0, 3)
    .map((l) => [l.city, l.state, l.country].filter(Boolean).join(', '))
    .join(' | ') || 'Not specified';

  const centralContacts = contacts?.centralContacts ?? [];
  const locationContacts = (contacts?.locations ?? [])
    .flatMap((l) => l.contacts ?? [])
    .filter(Boolean);

  const rawContact = centralContacts[0] ?? locationContacts[0] ?? null;
  const contact = rawContact
    ? [
        rawContact.name,
        rawContact.role ? `(${rawContact.role})` : null,
        rawContact.phone ? `📞 ${rawContact.phone}` : null,
        rawContact.email ? `✉ ${rawContact.email}` : null,
      ].filter(Boolean).join(' ')
    : 'Contact not listed';

  return {
    id:          `trial_${nctId}`,
    nctId,
    title:       id?.briefTitle ?? id?.officialTitle ?? 'Untitled Trial',
    status:      status?.overallStatus ?? 'Unknown',
    phase:       (design?.phases ?? []).join(', ') || 'N/A',
    eligibility: eligibility?.eligibilityCriteria?.slice(0, 600) ?? 'Not specified',
    location:    locationStr,
    contact,
    url:         `https://clinicaltrials.gov/study/${nctId}`,
    startDate:   status?.startDateStruct?.date ?? '',
    source:      'ClinicalTrials.gov',
  };
}
