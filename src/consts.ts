export const SITE = {
  title: 'Inside DOSBox-X',
  subtitle: 'Understanding the IBM PC Emulation',
  description:
    'A deep-dive technical book exploring the internals of DOSBox-X, IBM PC architecture, CPU emulation, graphics, sound, memory management, BIOS/DOS interaction, and emulator design.',
  rssDescription: 'Companion site for Inside DOSBox-X: Understanding the IBM PC Emulation.',
  author: 'Krzysztof',
  ogImage: '/og.jpg',
  repo: 'https://github.com/x16lab/dosbox-x-internals',
  footerText: 'Inside DOSBox-X — Understanding the IBM PC Emulation.',
} as const;

export const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/toc/', label: 'Contents' },
  { href: '/read/', label: 'Read' },
  { href: '/search/', label: 'Search' },
  { href: '/license/', label: 'License' },
] as const;

const APPENDICES = [
  { slug: 'appendix-a-glossary', title: 'Appendix A — Glossary', order: 18 },
  { slug: 'appendix-b-comparative-table', title: 'Appendix B — DOSBox-X in Context', order: 19 },
  { slug: 'appendix-c-source-map', title: 'Appendix C — Annotated Source Map', order: 20 },
  { slug: 'appendix-d-configuration-reference', title: 'Appendix D — Configuration Reference', order: 21 },
] as const;

export const BOOK_NAV = [
  { slug: 'introduction', title: 'Introduction', order: 0 },
  { slug: 'what-is-dosbox-x', title: 'What Is DOSBox-X and Why Does It Exist?', order: 1 },
  { slug: 'dosbox-x-architecture', title: 'DOSBox-X Architecture', order: 2 },
  { slug: 'time-in-dosbox-x', title: 'Time in DOSBox-X', order: 3 },
  { slug: 'main-loop-and-event-scheduler', title: 'The Main Loop and Event Scheduler', order: 4 },
  { slug: 'memory-model-and-address-translation', title: 'Memory Model and Address Translation', order: 5 },
  { slug: 'interpreter-core', title: 'The Interpreter Core', order: 6 },
  { slug: 'dynamic-recompilation', title: 'Dynamic Recompilation', order: 7 },
  { slug: 'interrupts-exceptions-pic', title: 'Interrupts, Exceptions, and the PIC', order: 8 },
  { slug: 'protected-mode', title: 'Protected Mode: Descriptors, Task Switching, and DPMI', order: 9 },
  { slug: 'vga-emulation', title: 'VGA/SVGA Emulation', order: 10 },
  { slug: 'dma-and-pit', title: 'DMA and the PIT', order: 11 },
  { slug: 'sound', title: 'Sound', order: 12 },
  { slug: 'serial-parallel-peripherals', title: 'Serial, Parallel, and Peripheral I/O', order: 13 },
  { slug: 'the-bios-layer', title: 'The BIOS Layer', order: 14 },
  { slug: 'the-dos-kernel', title: 'The DOS Kernel', order: 15 },
  { slug: 'timing-and-cycle-management', title: 'Timing and Cycle Management', order: 16 },
  { slug: 'host-abstraction-sdl', title: 'Host Abstraction via SDL', order: 17 },
  { slug: 'dosbox-x-extensions', title: 'DOSBox-X-Specific Extensions', order: 18 },
  { slug: 'debugger-logging-static-analysis', title: 'Debugging and Instrumentation', order: 19 },
  ...APPENDICES
] as const;
