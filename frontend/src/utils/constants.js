export const API_BASE_URL = '/api';

export const SOURCES = {
  PUBMED: 'PubMed',
  OPENALEX: 'OpenAlex',
  CLINICAL_TRIALS: 'ClinicalTrials.gov',
};

export const SOURCE_COLORS = {
  PubMed:               { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  OpenAlex:             { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'ClinicalTrials.gov': { bg: 'bg-violet-500/15',  text: 'text-violet-400',  border: 'border-violet-500/30' },
};

export const TRIAL_STATUS_COLORS = {
  RECRUITING:            { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-500' },
  ACTIVE_NOT_RECRUITING: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  dot: 'bg-amber-500' },
  COMPLETED:             { bg: 'bg-indigo-500/10', text: 'text-indigo-400', dot: 'bg-indigo-500' },
  TERMINATED:            { bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-500' },
  UNKNOWN:               { bg: 'bg-slate-500/10',  text: 'text-slate-400',  dot: 'bg-slate-500' },
};

export const TAB_LABELS = {
  SUMMARY: 'summary',
  PUBLICATIONS: 'publications',
  TRIALS: 'trials',
  SOURCES: 'sources',
};

export const EXAMPLE_QUERIES = [
  { disease: 'Lung Cancer', query: 'Latest immunotherapy treatments' },
  { disease: "Parkinson's Disease", query: 'Deep brain stimulation outcomes' },
  { disease: 'Alzheimer\'s Disease', query: 'Top researchers and new drug trials' },
  { disease: 'Type 2 Diabetes', query: 'Clinical trials for GLP-1 receptor agonists' },
  { disease: 'Heart Disease', query: 'Recent cardiovascular risk reduction studies' },
];
