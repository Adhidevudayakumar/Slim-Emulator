# Slim Emulator

Slim Emulator is a local CLI for creating and managing Android emulator profiles and establishing a resource-usage baseline. It uses the Android SDK already installed on your machine.

## MVP status

The MVP provides profile initialization, AVD creation, emulator lifecycle management, APK install/launch, logcat, runtime capability reporting, and versioned benchmark JSON. It does not build AOSP or promise lower resource usage than a standard emulator.

### Requirements

- Node.js 20 or newer
- Android SDK with `adb`, `emulator`, `avdmanager`, and `sdkmanager`
- An installed emulator system image (the default profile uses API 35, `default`, `x86_64`)
- Linux or macOS for the supported host workflows

Set `ANDROID_SDK_ROOT` or `ANDROID_HOME` if the SDK is outside a standard location. Slim Emulator never installs SDK tools or images automatically and does not modify the SDK installation.

### Development

```sh
npm install
npm run dev -- --help
npm run build
npm test
```

The compiled executable is `dist/index.js`; `npm link` makes `slim-em` available globally for local development.

### Workflow

```sh
npm run dev -- init
npm run dev -- create slim-dev
npm run dev -- start slim-dev
npm run dev -- status slim-dev
npm run dev -- install ./app.apk --profile slim-dev
npm run dev -- launch com.example.app --profile slim-dev
npm run dev -- logs --profile slim-dev
npm run dev -- benchmark slim-dev --package com.example.app
npm run dev -- stop slim-dev
```

`create` writes a default profile when one does not exist. Override the default API/architecture for a new profile with `create <name> --api 35 --arch x86_64`. Profiles live in the OS user configuration directory. Edit the profile JSON there to tune memory, storage, display, device, or requested capabilities.

`reset <profile-name>` restores a profile to the shared defaults after confirmation. `reset <profile-name> --force` skips the confirmation. Reset changes only the profile JSON; it does not delete an AVD, installed apps, benchmark results, or other user data.

Use `--profile` with `install`, `launch`, or `logs` when more than one emulator is running. `capabilities <profile-name>` compares requested capabilities with features reported by Android. This is informational only.

### Configuration and measurement

Profiles are versioned JSON. The `services` values describe requested capabilities; they do not remove packages or disable Android framework services. AVD RAM, storage, and display settings configure the virtual device but do not guarantee host resource consumption.

`benchmark` starts and boots a stopped AVD, recording that boot duration. If the AVD is already running, boot time is reported as not measured rather than restarting it. Memory is the host emulator process RSS, not exact guest Android RAM. CPU is a host process sample. Disk reports the AVD directory and system-image directory separately. If `--package` is supplied, the command force-stops that app and measures the time for the launch command to return; this is not an instrumented first-frame measurement.

Timestamped benchmark files are written under the user configuration directory, not into the repository. Absolute SDK paths are not included in the results.

### Current limitations

- No AOSP build, package removal, or arbitrary service disabling.
- Local/custom system-image profiles are reserved for future use; AVD creation currently supports installed SDK images only.
- Benchmark CPU and memory values are host-side snapshots and can vary with host OS, emulator version, and workload.
- Real emulator tests require an installed Android SDK and system image; unit tests do not.

### Roadmap

1. CLI, emulator lifecycle, and benchmark baseline.
2. Reproducible AOSP emulator image builds.
3. Identify removable packages and services.
4. Build and compare Slim AOSP images.
5. Capability-driven image configuration.
6. Automated compatibility and resource optimization.
