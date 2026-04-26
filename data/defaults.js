// Default seed data for products and blog posts.
// Stored in localStorage and editable via the Admin page.
window.CHEERVINSKY_DEFAULTS = {
  products: [],
  posts: [
    {
      id: 'neurodream-features',
      title: 'NeuroDream — new features',
      excerpt: 'A handful of small, careful additions to the dream journal — gentler nudges, a new pattern view, and the long-promised export.',
      cover: 'assets/iphone-mockup.png',
      author: 'The Cheervinsky Studio',
      date: '2026-04-18',
      pinned: true,
      tags: ['release', 'mira'],
      body: `# A few small things\n\nWe shipped a small update to the dream journal this week. Nothing flashy — just three things we\'ve been quietly working on for a while.\n\n## Gentler nudges\n\nThe old reminder was a small bell. The new one is a soft chime that fades in over four seconds. You can almost ignore it, which is the point.\n\n## Pattern view\n\nA new lens on your last twelve weeks. We don\'t draw conclusions for you — we just show what was there.\n\n## Export\n\nFinally. Markdown, PDF, or plain text. Your data, your file, no account required.`
    },
    {
      id: 'why-paper',
      title: 'Why we still design like it\'s paper',
      excerpt: 'On warm cream backgrounds, soft shadows, and the surprisingly modern feeling of an old notebook.',
      cover: '',
      author: 'Anya, design',
      date: '2026-03-22',
      pinned: false,
      tags: ['design', 'studio'],
      body: `Software doesn\'t have to feel like software. We use a warm paper background, hairline rules, and shadows that look like they came from sunlight rather than a CSS box-shadow generator. It sounds small. It changes everything.`
    },
    {
      id: 'kiln-launch',
      title: 'Kiln is here',
      excerpt: 'A timer that doesn\'t want anything from you. Available now on iOS and Android.',
      cover: '',
      author: 'The Cheervinsky Studio',
      date: '2026-02-14',
      pinned: false,
      tags: ['release', 'kiln'],
      body: `Kiln has been on our desks for the better part of a year. It is a focus timer that does almost nothing, and we\'re a little proud of that.`
    },
    {
      id: 'team-letter',
      title: 'A small letter from the studio',
      excerpt: 'Five apps. One small studio. Here\'s how we\'re thinking about the next year.',
      cover: '',
      author: 'Anya & Roma',
      date: '2026-01-09',
      pinned: false,
      tags: ['studio'],
      body: `Hello. We started Cheervinsky as a place to make small, careful tools for the kind of life we want to live. Twelve months in, we are five apps, two people, and a long list of things we still want to make.`
    }
  ]
};
