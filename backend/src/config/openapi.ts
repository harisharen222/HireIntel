/**
 * OpenAPI 3 spec served at /api/docs.
 * Kept hand-written rather than generated — it's short enough that clarity
 * wins over plumbing, and it doubles as the API contract reviewers can read.
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TalentMatch AI API',
    version: '1.0.0',
    description: 'BFF gateway for semantic job matching. All auth uses HttpOnly cookies.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['CANDIDATE', 'RECRUITER', 'ADMIN'] },
          fullName: { type: 'string' },
        },
      },
      Match: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          jobTitle: { type: 'string' },
          company: { type: 'string' },
          finalScore: { type: 'number' },
          breakdown: {
            type: 'object',
            properties: {
              semanticSimilarity: { type: 'number' },
              skillOverlap: { type: 'number' },
              experienceFit: { type: 'number' },
            },
          },
          matchedSkills: { type: 'array', items: { type: 'string' } },
          missingSkills: { type: 'array', items: { type: 'string' } },
          verdict: { type: 'string', enum: ['STRONG_FIT', 'MEDIUM_FIT', 'WEAK_FIT'] },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Create a new account',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 10 },
                  fullName: { type: 'string' },
                  role: { type: 'string', enum: ['CANDIDATE', 'RECRUITER'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created, session cookies set' },
          409: {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate and receive session cookies',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current user',
        tags: ['Auth'],
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'OK' }, 401: { description: 'Unauthenticated' } },
      },
    },
    '/cv/upload': {
      post: {
        summary: 'Upload a CV (PDF, <=5MB)',
        tags: ['CV'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'CV accepted and indexed' },
          422: { description: 'Invalid PDF or unparseable' },
        },
      },
    },
    '/match/run': {
      post: {
        summary: 'Run a matching query',
        tags: ['Match'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cvId: { type: 'string' },
                  jobId: { type: 'string' },
                  topK: { type: 'integer', default: 10 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Ranked matches',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    runId: { type: 'string' },
                    matches: { type: 'array', items: { $ref: '#/components/schemas/Match' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
