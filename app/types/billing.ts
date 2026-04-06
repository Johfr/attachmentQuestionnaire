// billing.ts

export type EntityType = 'questionnaire' | 'article' | 'formation'
export type EntitySubType = 'attachment' | 'conscience' | 'compatibility' | 'other' // à adapter selon les types de contenus proposés 
export type AccessType = 'results' | 'ia' | 'membership' | 'formation'
export type EntityVersion = 'v1' | 'v2' | 'v3' // à adapter selon les versions disponibles