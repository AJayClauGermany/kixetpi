// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';

// https://astro.build/config
export default defineConfig({
	site: 'https://surajssingh.github.io',
	base: '/kixetpi',
	integrations: [
		starlight({
			title: 'KixetPi',
			plugins: [
				// Generates /llms.txt (agent entry point), /llms-full.txt, /llms-small.txt,
				// and the custom sets below. See https://llmstxt.org/.
				starlightLlmsTxt({
					projectName: 'KixetPi',
					description:
						'KixetPi is an untested research guide for adapting an official Raspberry Pi OS Lite (Debian 13 Trixie) installation on a separate test Pi: reduce it with DietPi-inspired practices, harden it with Kicksecure-inspired practices, and optionally add Nix and Home Manager for user packages. It is documentation, not an installer or an OS image.',
					details: `Start here if you are an AI agent:

1. Read the [agent assistance companion](https://surajssingh.github.io/kixetpi/reference/agent-assistance/) before proposing or running any command. It gives the reading path, decision gates, and handoff template. The [Agent essentials](https://surajssingh.github.io/kixetpi/_llms-txt/agent-essentials.txt) set bundles it with the overview, conventions, limits, and record templates.
2. Treat the four stage guides as the only authoritative procedure: [1. Raspberry Pi OS Lite](https://surajssingh.github.io/kixetpi/guides/raspberry-pi-os/), [2. DietPi-inspired reduction](https://surajssingh.github.io/kixetpi/guides/dietpi/), [3. Kicksecure-inspired hardening](https://surajssingh.github.io/kixetpi/guides/kicksecure/), and [4. optional Nix](https://surajssingh.github.io/kixetpi/guides/nix/). Explanation pages justify steps but never authorize extra ones.
3. Use [Conventions and command effects](https://surajssingh.github.io/kixetpi/reference/conventions/) to resolve where a code block runs, what a placeholder means, and whether a command changes state.
4. Check [Versions and sources](https://surajssingh.github.io/kixetpi/reference/versions/) for pinned releases and review dates before relying on a version-specific instruction.

Rules that apply to every task:

- No step has passed a Raspberry Pi hardware test. Do not claim measured savings, completed hardening, or working recovery without evidence from the target.
- Commands target a separate test Pi (or, for the VM test run, a disposable Debian VM), never the computer hosting this documentation. Confirm the operator's target, scope, and authorization first; reading these docs grants no permission to execute.
- A code block's title names where it runs (\`Pi:\`, \`Pi local console:\`, \`Administration computer:\`, a file path for file contents). Run one step at a time, read the text after each block, and stop on unexpected output.
- Never bypass password prompts, package signatures, TLS, SSH host keys, or Nix trust checks, and never add \`-y\`, \`--force\`, or passwordless sudo to avoid interaction.
- Keep "proposed", "executed", and "verified" distinct, and record results in the [walkthrough record](https://surajssingh.github.io/kixetpi/reference/walkthrough-record/).

Links inside the bundled text that start with \`/kixetpi/\` are relative to https://surajssingh.github.io. When working from the source repository instead, the same pages live under \`src/content/docs/\`, and \`AGENTS.md\` covers repository development.`,
					customSets: [
						{
							label: 'Agent essentials',
							description:
								'start here: the agent companion, overview, conventions and command effects, limits, versions, and the walkthrough record',
							paths: [
								'index',
								'reference/agent-assistance',
								'reference/conventions',
								'reference/versions',
								'reference/walkthrough-record',
								'explanation/limits',
							],
						},
						{
							label: 'Stage guides',
							description: 'the authoritative four-stage procedure, in order',
							paths: ['guides/**'],
						},
						{
							label: 'Explanation',
							description: 'why the project adapts rather than converts, ownership rules, and the limits of its claims',
							paths: ['explanation/**'],
						},
						{
							label: 'VM command test run',
							description: 'the Debian ARM64 Lima preflight procedure and its recorded trials; not a Raspberry Pi test',
							paths: ['reference/vm-test-run'],
						},
					],
					promote: [
						'index*',
						'reference/agent-assistance',
						'reference/conventions',
						'guides/raspberry-pi-os',
						'guides/dietpi',
						'guides/kicksecure',
						'guides/nix',
					],
					demote: ['reference/vm-test-run'],
					// Keep tables and lists line-oriented in the abridged and custom sets,
					// and drop Starlight's "Section titled" heading anchors from every output.
					minify: { whitespace: false },
					// Emit the Markdown source so code-block titles (which name where a command
					// runs) and :::caution asides survive; HTML conversion drops the titles.
					rawContent: true,
					customSelectors: { all: ['.sl-anchor-link'] },
					exclude: ['reference/vm-test-run'],
				}),
			],
			sidebar: [
				{ label: 'Start here', slug: '' },
				{
					label: 'Build your system',
					items: [
						{ label: '1. Raspberry Pi OS Lite', slug: 'guides/raspberry-pi-os' },
						{ label: '2. DietPi-inspired reduction', slug: 'guides/dietpi' },
						{ label: '3. Kicksecure-inspired hardening', slug: 'guides/kicksecure' },
						{ label: '4. Nix for your home', slug: 'guides/nix', badge: 'Optional' },
					],
				},
				{
					label: 'Understand the approach',
					items: [
						{ label: 'Why adapt instead of convert', slug: 'explanation/adapt-not-convert' },
						{ label: 'Security, performance, and recovery limits', slug: 'explanation/limits' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Conventions and command effects', slug: 'reference/conventions' },
						{ label: 'Walkthrough record', slug: 'reference/walkthrough-record' },
						{ label: 'Versions and sources', slug: 'reference/versions' },
					],
				},
				{
					label: 'Agents and testing',
					items: [
						{ label: 'Assisting with an AI agent', slug: 'reference/agent-assistance' },
						{ label: 'VM command test run', slug: 'reference/vm-test-run' },
					],
				},
			],
		}),
	],
});
