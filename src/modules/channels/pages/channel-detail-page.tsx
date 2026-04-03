ERROR: failed to build: failed to solve: process "/bin/bash -ol pipefail -c npm run build" did not complete successfully: exit code: 1
2026-Apr-03 14:24:58.285668
exit status 1
2026-Apr-03 14:24:58.375021
========================================
2026-Apr-03 14:24:58.384462
Deployment failed: Command execution failed (exit code 1): docker exec iackav55nfbjg5vxi9s36k0h bash -c 'bash /artifacts/build.sh'
2026-Apr-03 14:24:58.384462
Error: #0 building with "default" instance using docker driver
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#1 [internal] load build definition from Dockerfile
2026-Apr-03 14:24:58.384462
#1 transferring dockerfile: 1.50kB done
2026-Apr-03 14:24:58.384462
#1 DONE 0.0s
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#2 [internal] load metadata for ghcr.io/railwayapp/nixpacks:ubuntu-1745885067
2026-Apr-03 14:24:58.384462
#2 DONE 0.4s
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#3 [internal] load .dockerignore
2026-Apr-03 14:24:58.384462
#3 transferring context: 2B done
2026-Apr-03 14:24:58.384462
#3 DONE 0.0s
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#4 [stage-0  1/11] FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067@sha256:d45c89d80e13d7ad0fd555b5130f22a866d9dd10e861f589932303ef2314c7de
2026-Apr-03 14:24:58.384462
#4 resolve ghcr.io/railwayapp/nixpacks:ubuntu-1745885067@sha256:d45c89d80e13d7ad0fd555b5130f22a866d9dd10e861f589932303ef2314c7de 0.1s done
2026-Apr-03 14:24:58.384462
#4 DONE 0.1s
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#5 [internal] load build context
2026-Apr-03 14:24:58.384462
#5 transferring context: 90.88kB 0.0s done
2026-Apr-03 14:24:58.384462
#5 DONE 0.1s
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#6 [stage-0  2/11] WORKDIR /app/
2026-Apr-03 14:24:58.384462
#6 CACHED
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#7 [stage-0  3/11] COPY .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix
2026-Apr-03 14:24:58.384462
#7 CACHED
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#8 [stage-0  4/11] RUN nix-env -if .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix && nix-collect-garbage -d
2026-Apr-03 14:24:58.384462
#8 CACHED
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#9 [stage-0  5/11] RUN sudo apt-get update && sudo apt-get install -y --no-install-recommends curl wget
2026-Apr-03 14:24:58.384462
#9 CACHED
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#10 [stage-0  6/11] COPY . /app/.
2026-Apr-03 14:24:58.384462
#10 DONE 0.1s
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
#11 [stage-0  7/11] RUN --mount=type=cache,id=yccfmd4h13a1y6hi691si73r-/root/npm,target=/root/.npm npm i
2026-Apr-03 14:24:58.384462
#11 0.678 npm warn config production Use `--omit=dev` instead.
2026-Apr-03 14:24:58.384462
#11 30.78 npm warn EBADENGINE Unsupported engine {
2026-Apr-03 14:24:58.384462
#11 30.78 npm warn EBADENGINE   package: 'eslint-visitor-keys@5.0.1',
2026-Apr-03 14:24:58.384462
#11 30.78 npm warn EBADENGINE   required: { node: '^20.19.0 || ^22.13.0 || >=24' },
2026-Apr-03 14:24:58.384462
#11 30.78 npm warn EBADENGINE   current: { node: 'v22.11.0', npm: '10.9.0' }
2026-Apr-03 14:24:58.384462
#11 30.78 npm warn EBADENGINE }
2026-Apr-03 14:24:58.384462
#11 39.64 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
2026-Apr-03 14:24:58.384462
#11 40.00 npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
2026-Apr-03 14:24:58.384462
#11 40.02 npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
2026-Apr-03 14:24:58.384462
#11 40.24 npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
2026-Apr-03 14:24:58.384462
#11 40.25 npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting <REDACTED>
2026-Apr-03 14:24:58.384462
#11 43.42 npm warn deprecated glob@10.3.10: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting <REDACTED>
2026-Apr-03 14:24:58.384462
#11 45.42 npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.
2026-Apr-03 14:24:58.384462
#11 53.10
2026-Apr-03 14:24:58.384462
#11 53.10 added 424 packages, and audited 425 packages in 53s
2026-Apr-03 14:24:58.384462
#11 53.10
2026-Apr-03 14:24:58.384462
#11 53.10 154 packages are looking for funding
2026-Apr-03 14:24:58.384462
#11 53.11   run `npm fund` for details
2026-Apr-03 14:24:58.384462
#11 53.23
2026-Apr-03 14:24:58.384462
#11 53.23 4 high severity vulnerabilities
2026-Apr-03 14:24:58.384462
#11 53.23
2026-Apr-03 14:24:58.384462
#11 53.23 To address all issues (including breaking changes), run:<REDACTED>@0.1.0 build
2026-Apr-03 14:24:58.384462
#13 0.525 > next build
2026-Apr-03 14:24:58.384462
#13 0.525
2026-Apr-03 14:24:58.384462
#13 1.702   ▲ Next.js 14.2.35
2026-Apr-03 14:24:58.384462
#13 1.703
2026-Apr-03 14:24:58.384462
#13 1.813    Creating an optimized production build ...
2026-Apr-03 14:24:58.384462
#13 17.70  ✓ Compiled successfully
2026-Apr-03 14:24:58.384462
#13 17.70    Linting and checking validity of types ...
2026-Apr-03 14:24:58.384462
#13 30.34
2026-Apr-03 14:24:58.384462
#13 30.34 ./src/modules/channels/pages/channels-list-page.tsx
2026-Apr-03 14:24:58.384462
#13 30.34 47:32  Warning: React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
2026-Apr-03 14:24:58.384462
#13 30.34
2026-Apr-03 14:24:58.384462
#13 30.34 info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/basic-features/eslint#disabling-rules
2026-Apr-03 14:24:58.384462
#13 34.32 Failed to compile.
2026-Apr-03 14:24:58.384462
#13 34.32
2026-Apr-03 14:24:58.384462
#13 34.32 ./src/modules/channels/pages/channel-detail-page.tsx:68:26
2026-Apr-03 14:24:58.384462
#13 34.32 Type error: Property 'isGlobal' does not exist on type 'Product'. Did you mean 'global'?
2026-Apr-03 14:24:58.384462
#13 34.32
2026-Apr-03 14:24:58.384462
#13 34.32   66 |
2026-Apr-03 14:24:58.384462
#13 34.32   67 |   const linkedProducts = products.filter(
2026-Apr-03 14:24:58.384462
#13 34.32 > 68 |     (product) => product.isGlobal || product.channelIds?.includes(channel.id)
2026-Apr-03 14:24:58.384462
#13 34.32      |                          ^
2026-Apr-03 14:24:58.384462
#13 34.32   69 |   );
2026-Apr-03 14:24:58.384462
#13 34.32   70 |
2026-Apr-03 14:24:58.384462
#13 34.32   71 |   return (
2026-Apr-03 14:24:58.384462
#13 34.38 Next.js build worker exited with code: 1 and signal: null
2026-Apr-03 14:24:58.384462
#13 ERROR: process "/bin/bash -ol pipefail -c npm run build" did not complete successfully: exit code: 1
2026-Apr-03 14:24:58.384462
------
2026-Apr-03 14:24:58.384462
> [stage-0  9/11] RUN --mount=type=cache,id=yccfmd4h13a1y6hi691si73r-next/cache,target=/app/.next/cache --mount=type=cache,id=yccfmd4h13a1y6hi691si73r-node_modules/cache,target=/app/node_modules/.cache npm run build:
2026-Apr-03 14:24:58.384462
34.32 Type error: Property 'isGlobal' does not exist on type 'Product'. Did you mean 'global'?
2026-Apr-03 14:24:58.384462
34.32
2026-Apr-03 14:24:58.384462
34.32   66 |
2026-Apr-03 14:24:58.384462
34.32   67 |   const linkedProducts = products.filter(
2026-Apr-03 14:24:58.384462
34.32 > 68 |     (product) => product.isGlobal || product.channelIds?.includes(channel.id)
2026-Apr-03 14:24:58.384462
34.32      |                          ^
2026-Apr-03 14:24:58.384462
34.32   69 |   );
2026-Apr-03 14:24:58.384462
34.32   70 |
2026-Apr-03 14:24:58.384462
34.32   71 |   return (
2026-Apr-03 14:24:58.384462
34.38 Next.js build worker exited with code: 1 and signal: null
2026-Apr-03 14:24:58.384462
------
2026-Apr-03 14:24:58.384462
2026-Apr-03 14:24:58.384462
1 warning found (use docker --debug to expand):
2026-Apr-03 14:24:58.384462
- UndefinedVar: Usage of undefined variable '$NIXPACKS_PATH' (line 18)
2026-Apr-03 14:24:58.384462
Dockerfile:24
2026-Apr-03 14:24:58.384462
--------------------
2026-Apr-03 14:24:58.384462
22 |     # build phase
2026-Apr-03 14:24:58.384462
23 |     COPY . /app/.
2026-Apr-03 14:24:58.384462
24 | >>> RUN --mount=type=cache,id=yccfmd4h13a1y6hi691si73r-next/cache,target=/app/.next/cache --mount=type=cache,id=yccfmd4h13a1y6hi691si73r-node_modules/cache,target=/app/node_modules/.cache npm run build
2026-Apr-03 14:24:58.384462
25 |
2026-Apr-03 14:24:58.384462
26 |
2026-Apr-03 14:24:58.384462
--------------------
2026-Apr-03 14:24:58.384462
ERROR: failed to build: failed to solve: process "/bin/bash -ol pipefail -c npm run build" did not complete successfully: exit code: 1
2026-Apr-03 14:24:58.384462
exit status 1
2026-Apr-03 14:24:58.395582
Error type: App\Exceptions\DeploymentException
2026-Apr-03 14:24:58.405302
Error code: 0
2026-Apr-03 14:24:58.414641
Location: /var/www/html/app/Traits/ExecuteRemoteCommand.php:237
2026-Apr-03 14:24:58.423657
Stack trace (first 5 lines):
2026-Apr-03 14:24:58.433200
#0 /var/www/html/app/Traits/ExecuteRemoteCommand.php(105): App\Jobs\ApplicationDeploymentJob->executeCommandWithProcess()
2026-Apr-03 14:24:58.444337
#1 /var/www/html/vendor/laravel/framework/src/Illuminate/Collections/Traits/EnumeratesValues.php(275): App\Jobs\ApplicationDeploymentJob->{closure:App\Traits\ExecuteRemoteCommand::execute_remote_command():72}()
2026-Apr-03 14:24:58.456453
#2 /var/www/html/app/Traits/ExecuteRemoteCommand.php(72): Illuminate\Support\Collection->each()
2026-Apr-03 14:24:58.467842
#3 /var/www/html/app/Jobs/ApplicationDeploymentJob.php(3200): App\Jobs\ApplicationDeploymentJob->execute_remote_command()
2026-Apr-03 14:24:58.479176
#4 /var/www/html/app/Jobs/ApplicationDeploymentJob.php(915): App\Jobs\ApplicationDeploymentJob->build_image()
2026-Apr-03 14:24:58.489770
========================================
2026-Apr-03 14:24:58.500865
Deployment failed. Removing the new version of your application.
