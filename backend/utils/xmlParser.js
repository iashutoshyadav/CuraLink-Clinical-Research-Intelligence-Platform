import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) =>
    ['PubmedArticle', 'Author', 'AbstractText', 'MeshHeading', 'PublicationType', 'Chemical'].includes(name),
  parseTagValue: true,
  trimValues: true,

});

export function parsePubMedXML(xmlString) {
  try {
    return parser.parse(xmlString);
  } catch (err) {
    throw new Error(`PubMed XML parse error: ${err.message}`);
  }
}

function extractArticle(article) {
  try {
    const citation   = article?.MedlineCitation;
    const articleData = citation?.Article;
    const pmid       = citation?.PMID?.['#text'] || citation?.PMID || '';

    const title = articleData?.ArticleTitle?.['#text'] ?? articleData?.ArticleTitle ?? 'Untitled';

    let abstract = '';
    const abstractEl = articleData?.Abstract?.AbstractText;
    if (Array.isArray(abstractEl)) {
      abstract = abstractEl.map((t) => (typeof t === 'object' ? t['#text'] ?? '' : t)).join(' ');
    } else if (typeof abstractEl === 'string') {
      abstract = abstractEl;
    } else if (abstractEl?.['#text']) {
      abstract = abstractEl['#text'];
    }

    const authorList = articleData?.AuthorList?.Author ?? [];
    const authors = authorList
      .slice(0, 5)
      .map((a) => {
        const last  = a?.LastName ?? '';
        const first = a?.ForeName ?? a?.Initials ?? '';
        return `${last}${first ? `, ${first}` : ''}`;
      })
      .filter(Boolean);

    const pubDate = articleData?.Journal?.JournalIssue?.PubDate;
    const year    = pubDate?.Year ?? pubDate?.MedlineDate?.slice(0, 4) ?? '';
    const journal = articleData?.Journal?.Title ?? '';

    return {
      id: `pubmed_${pmid}`,
      pmid,
      title:    String(title).replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim(),
      abstract: abstract.trim(),
      authors,
      year:     String(year),
      source:   'PubMed',
      journal,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    };
  } catch {
    return null;
  }
}

export function parsePubMedArticles(xmlString) {
  const parsed   = parsePubMedXML(xmlString);
  const articles = parsed?.PubmedArticleSet?.PubmedArticle ?? [];
  return articles.map(extractArticle).filter(Boolean);
}
