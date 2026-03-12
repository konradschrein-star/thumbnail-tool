export const EMERGENCY_CHANNELS = [
    {
        id: 'emergency-channel-1',
        name: 'Tech Tutorials Pro',
        personaDescription: `The host is a 28-year-old charismatic male with medium-length, slightly wavy brown hair styled casually with natural volume. He has warm hazel eyes, a strong defined jawline, and a friendly smile showing genuine enthusiasm. His face is oval-shaped with high cheekbones and a straight nose. He has a fit athletic build, stands confidently, and wears a simple black crew-neck t-shirt. His skin tone is lightly tanned (Mediterranean complexion). He has subtle stubble (5 o'clock shadow) giving him a mature, approachable look. His eyebrows are well-defined and expressive. This exact person appears in sharp focus with professional studio lighting, looking directly at the camera with an engaging, confident expression.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { archetypes: 6, generationJobs: 0 }
    }
];

export const EMERGENCY_ARCHETYPES = [
    {
        id: 'arch-2',
        name: 'Striking Warning Style',
        imageUrl: '/archetypes/archetype2.jpg',
        layoutInstructions: 'Bold warning colors with strong visual impact for attention-grabbing content',
        basePrompt: 'Give the image a striking, attention-grabbing vibe with bold, intense lighting. It should feel urgent and high-energy.',
        channelId: 'emergency-channel-1'
    },
    {
        id: 'arch-3',
        name: 'Modern Productivity Style',
        imageUrl: '/archetypes/archetype3.jpeg',
        layoutInstructions: 'Clean, modern aesthetic focused on productivity and workspace content',
        basePrompt: 'Maintain a clean, modern, and professional aesthetic. The vibe should be productive, minimalist, and highly polished.',
        channelId: 'emergency-channel-1'
    },
    {
        id: 'arch-4',
        name: 'Dramatic Bold Style',
        imageUrl: '/archetypes/archetype4.jpeg',
        layoutInstructions: 'Edgy, rebellious design with strong contrast for opinion/controversial content',
        basePrompt: 'Create an edgy, dramatic atmosphere with deep contrast and a slightly rebellious or intense vibe.',
        channelId: 'emergency-channel-1'
    },
    {
        id: 'arch-5',
        name: 'Educational Friendly Style',
        imageUrl: '/archetypes/archetype5.jpeg',
        layoutInstructions: 'Approachable, beginner-friendly design for step-by-step tutorials',
        basePrompt: 'Keep the atmosphere approachable, friendly, and educational. The tone should feel helpful, clear, and inviting for beginners.',
        channelId: 'emergency-channel-1'
    },
    {
        id: 'arch-6',
        name: 'Energetic Tech Style',
        imageUrl: '/archetypes/archetype6.jpeg',
        layoutInstructions: 'Dynamic, tech-focused layout with movement and energy for quick tips',
        basePrompt: 'Infuse the image with dynamic movement and energy. It should feel highly focused on technology and fast-paced learning.',
        channelId: 'emergency-channel-1'
    },
    {
        id: 'arch-7',
        name: 'Comparison Battle Style',
        imageUrl: '/archetypes/archetype7.jpeg',
        layoutInstructions: 'Split-screen comparison design with dramatic versus styling',
        basePrompt: 'Enhance a dramatic split-screen or versus vibe. It should feel highly competitive and comparative.',
        channelId: 'emergency-channel-1'
    },
    {
        id: 'arch-8',
        name: 'Premium Titan Style (Admin Only)',
        imageUrl: '/archetypes/Archetype.png',
        layoutInstructions: 'Highly curated, exclusive premium layout for top-tier content',
        basePrompt: 'Ensure an extremely premium, high-end visual aesthetic. It should look highly curated, flawless, and exclusive.',
        channelId: 'emergency-channel-1',
        isAdminOnly: true
    }
];
