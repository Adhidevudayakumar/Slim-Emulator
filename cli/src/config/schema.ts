import { z } from 'zod';

const architectureSchema = z.enum(['x86_64', 'arm64-v8a', 'x86']);

export const profileSchema = z.object({
  version: z.literal(1),
  name: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, 'Use letters, numbers, hyphens, or underscores.'),
  systemImage: z.object({
    source: z.enum(['sdk', 'local']),
    package: z.string().min(1).optional(),
    apiLevel: z.number().int().min(23).max(100),
    architecture: architectureSchema,
    location: z.string().min(1).optional(),
  }).superRefine((image, context) => {
    if (image.source === 'sdk' && !image.package) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['package'], message: 'SDK images require a package ID.' });
    }
    if (image.source === 'local' && !image.location) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['location'], message: 'Local images require a location.' });
    }
  }),
  device: z.object({ name: z.string().min(1) }),
  memory: z.object({ ramMB: z.number().int().min(512).max(65536) }),
  storage: z.object({ dataMB: z.number().int().positive().max(1048576) }),
  display: z.object({
    width: z.number().int().min(240).max(8192),
    height: z.number().int().min(240).max(8192),
    density: z.number().int().min(72).max(1000),
  }),
  services: z.object({
    wifi: z.boolean(),
    location: z.boolean(),
    camera: z.boolean(),
    bluetooth: z.boolean(),
    nfc: z.boolean(),
  }),
});

export type EmulatorProfile = z.infer<typeof profileSchema>;

export function defaultProfile(name: string): EmulatorProfile {
  return profileSchema.parse({
    version: 1,
    name,
    systemImage: {
      source: 'sdk',
      package: 'system-images;android-35;default;x86_64',
      apiLevel: 35,
      architecture: 'x86_64',
    },
    device: { name: 'pixel_2' },
    memory: { ramMB: 1536 },
    storage: { dataMB: 4096 },
    display: { width: 1080, height: 1920, density: 420 },
    services: { wifi: true, location: true, camera: true, bluetooth: false, nfc: false },
  });
}