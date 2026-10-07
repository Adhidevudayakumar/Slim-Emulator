# Architecture

## MVP control plane

```text
CLI commands
  ├── Config manager and versioned profiles
  ├── Android SDK discovery
  ├── AVD manager
  ├── Emulator process manager
  ├── ADB operations
  └── Benchmark/resource measurements
          ↓
Existing Android SDK tools
          ↓
Installed system image → AVD → Emulator
```

Command modules validate user intent and delegate Android operations to `cli/src/android`. Configuration and profile validation are isolated under `cli/src/config`; benchmark collection and JSON output live under `cli/src/benchmark`. Child processes are launched with argument arrays rather than shell command strings.

Profiles are versioned JSON stored in the OS user config directory. Benchmarks are timestamped, versioned JSON stored alongside that user configuration. Runtime artifacts are not written to the repository.

## Image boundary

An AVD config describes virtual hardware and display/storage choices. Requested services in a profile are informational capabilities, not instructions to alter Android. The MVP does not change system images or disable framework services.

The profile's image reference distinguishes an SDK package from a future local image:

```text
system image source: sdk | local
```

The current AVD creator supports installed SDK package IDs. `local` is reserved for a future image-builder integration and is rejected clearly by the MVP rather than treated as an SDK package.

Future image builds remain a separate subsystem:

```text
AOSP source → image builder → local Slim image → AVD → emulator
```

That boundary lets the control plane and benchmark format remain useful for comparing standard SDK images with future custom images without embedding an AOSP build system into the CLI.

## Measurement semantics

- Boot duration is recorded only when the benchmark itself starts a stopped AVD. It does not restart an already-running emulator.
- Memory is summed host-process RSS for matching emulator/QEMU processes, not guest Android RAM.
- CPU is a host-side process sample.
- AVD directory size and SDK system-image directory size are reported separately.
- Optional app startup measures the time for Android's launch command to return after force-stopping the package; it is not a first-frame metric.