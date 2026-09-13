/**
 * Auto-fill templates for a creator's proposal cover letter, keyed by event
 * category — mirrors the mobile app's submit-proposal screen so both clients
 * suggest the same tone. Purely local text (no AI call); the creator can
 * freely edit or regenerate before submitting.
 */
const TEMPLATES: Record<string, string[]> = {
  Fashion: [
    `Hi {brand} team!\n\nI'm thrilled to apply for the "{title}" event. As a fashion content creator, I specialize in building authentic styling narratives that resonate with trend-conscious audiences.\n\nMy followers trust my honest reviews and aesthetic-first approach, and I'm confident I can showcase your brand in a way that feels both genuine and aspirational.\n\nLooking forward to the opportunity to collaborate!`,
    `Hello {brand}!\n\nThe "{title}" event immediately caught my eye. Fashion storytelling is my passion — I craft visually compelling content that drives real engagement among style enthusiasts.\n\nI have a strong track record of working with clothing and lifestyle brands to produce content that converts. I'd love to bring that same energy to this event.\n\nExcited to hear from you!`,
  ],
  Food: [
    `Hi {brand} team!\n\nI'm excited to apply for "{title}". Food content is my specialty — from recipe walkthroughs to honest restaurant reviews, I know how to make audiences genuinely hungry for more.\n\nMy community trusts my palate, and I have a proven ability to turn brand stories into craveable content. I'd be honored to bring your brand to their tables.\n\nLooking forward to creating something delicious together!`,
    `Hello {brand}!\n\nThe "{title}" event looks right up my alley. As a food creator, I turn every dish into a story — showcasing flavors in a way that feels personal and authentic.\n\nMy engaged foodie audience actively seeks out recommendations, and I'd love to introduce your brand to them in an organic, meaningful way.\n\nCan't wait to collaborate!`,
  ],
  Tech: [
    `Hi {brand} team!\n\nI'm applying for the "{title}" event with genuine enthusiasm. As a tech creator, I break down complex products into clear, relatable content that helps everyday users make smart decisions.\n\nMy audience values my honest, in-depth approach, and I believe a hands-on review or tutorial collaboration would work perfectly for this event.\n\nLooking forward to working together!`,
    `Hello {brand}!\n\nThe "{title}" opportunity aligns perfectly with my content niche. I create tech content that bridges the gap between specs and real-world usability — making products approachable for everyday consumers.\n\nI have experience reviewing gadgets, apps, and SaaS tools with a focus on authenticity and audience trust.\n\nExcited about this collaboration!`,
  ],
  Technology: [
    `Hi {brand} team!\n\nI'm excited to submit my application for "{title}". Technology content is at the core of what I do — I help audiences understand and appreciate products through honest, well-researched storytelling.\n\nMy followers look to me for trusted recommendations before making purchase decisions, which makes this partnership a natural fit.\n\nLooking forward to discussing further!`,
    `Hello {brand}!\n\nThe "{title}" event is a great match for my content style. I specialize in making technology feel accessible and exciting, whether through tutorials, unboxings, or comparison videos.\n\nI'd love to leverage my engaged audience to showcase your brand authentically.\n\nThank you for the opportunity!`,
  ],
  Beauty: [
    `Hi {brand} team!\n\nI'm so excited to apply for "{title}"! Beauty content is my passion — I create tutorials, reviews, and GRWM videos that feel personal and help my audience make confident choices.\n\nMy community trusts my skincare and makeup recommendations, and I'd love to introduce your products to them in an authentic way.\n\nCan't wait to create something beautiful together!`,
    `Hello {brand}!\n\nThe "{title}" event is exactly the kind of collaboration I look for. As a beauty creator, I believe in honest storytelling — my audience knows my reviews are real, which is why they keep coming back.\n\nI'd love to incorporate your brand into my routine content in a way that feels genuine and resonates deeply.\n\nLooking forward to this partnership!`,
  ],
  Travel: [
    `Hi {brand} team!\n\nI'm thrilled to apply for "{title}"! Travel storytelling is my craft — I take my audience on journeys through immersive visuals and authentic narratives.\n\nWith experience creating content across multiple destinations, I know how to highlight a brand's value in a way that feels organic to the travel experience.\n\nExcited about the possibility of exploring this together!`,
    `Hello {brand}!\n\nThe "{title}" event immediately inspired me. As a travel creator, I specialize in showcasing experiences in a way that makes my audience want to book their next trip right away.\n\nI'd love to weave your brand into my travel content seamlessly — making it feel like a natural part of the adventure.\n\nLooking forward to hearing from you!`,
  ],
  Fitness: [
    `Hi {brand} team!\n\nI'm pumped to apply for "{title}"! Fitness is not just my content niche — it's my lifestyle. I create workout content, nutrition tips, and product reviews that motivate and inform my highly engaged community.\n\nMy audience is always looking for gear and supplements they can trust, and I'd love to give your brand a genuine spotlight.\n\nLet's build something strong together!`,
    `Hello {brand}!\n\nThe "{title}" opportunity is a perfect fit for my content. As a fitness creator, I'm passionate about sharing what actually works — and my audience knows my recommendations come from real experience.\n\nI'd love to showcase your brand through authentic workout integration and honest reviews.\n\nExcited to collaborate!`,
  ],
  Gaming: [
    `Hi {brand} team!\n\nI'm stoked to apply for "{title}"! Gaming content is my world — I stream, create reviews, and build community around the games and gear I love.\n\nMy audience is highly engaged and always on the lookout for the next great product. I know how to make sponsored content feel like a genuine part of the gaming experience.\n\nLet's level up together!`,
    `Hello {brand}!\n\nThe "{title}" event looks like an epic collaboration. As a gaming creator, I understand what resonates with the gaming community — authenticity, humor, and skill.\n\nI'd love to integrate your brand naturally into my content, whether through gameplay, reviews, or creative storytelling.\n\nLooking forward to connecting!`,
  ],
  Music: [
    `Hi {brand} team!\n\nI'm excited to apply for "{title}"! Music and creative expression are at the heart of everything I do. I create content that connects emotionally with my audience — covers, original pieces, and behind-the-scenes looks at my creative process.\n\nI'd love to find a natural, creative way to weave your brand into my music journey.\n\nLet's make something great together!`,
    `Hello {brand}!\n\nThe "{title}" event resonates with me deeply. As a music creator, I understand how to tell stories that move people — and I believe that same emotional connection can make your brand unforgettable.\n\nI'd love to bring my creative vision to this event in a way that feels authentic to my audience.\n\nLooking forward to collaborating!`,
  ],
  Education: [
    `Hi {brand} team!\n\nI'm delighted to apply for "{title}"! Educational content is my calling — I break down complex topics into clear, engaging lessons that my audience genuinely learns from.\n\nMy followers trust me to recommend only tools and resources that are truly valuable. I'd love to share how your brand fits into a meaningful learning journey.\n\nExcited to teach and inspire together!`,
    `Hello {brand}!\n\nThe "{title}" event is a great match for my educational content approach. I specialize in creating content that informs, empowers, and builds lasting trust with my audience.\n\nI'd love to authentically integrate your brand into my tutorials or explainer content in a way that adds real value.\n\nLooking forward to this opportunity!`,
  ],
  Lifestyle: [
    `Hi {brand} team!\n\nI'm excited to apply for "{title}"! Lifestyle content is my specialty — I share everything from morning routines to product hauls in a way that feels authentic and aspirational for my audience.\n\nMy community trusts my everyday recommendations, and I'd love to show them how your brand fits naturally into a life well-lived.\n\nLooking forward to collaborating!`,
    `Hello {brand}!\n\nThe "{title}" event is exactly my type of collaboration. As a lifestyle creator, I'm passionate about showing my audience how to live better — and great brands are a big part of that story.\n\nI'd love to integrate your product into my content in a way that feels organic and compelling.\n\nExcited about this opportunity!`,
  ],
  Sports: [
    `Hi {brand} team!\n\nI'm pumped to apply for "{title}"! Sports content is my passion — I create highlight reels, training videos, and athlete stories that fire up my audience.\n\nMy community is passionate, competitive, and always looking for gear and brands that match their drive. I'd love to bring your brand into that world authentically.\n\nLet's win together!`,
    `Hello {brand}!\n\nThe "{title}" event is a great fit for my sports-focused content. I specialize in creating content that celebrates athleticism and inspires peak performance.\n\nI'd love to showcase your brand alongside my training content in a way that resonates with competitive athletes and sports enthusiasts.\n\nLooking forward to this partnership!`,
  ],
  Wellness: [
    `Hi {brand} team!\n\nI'm genuinely excited to apply for "{title}"! Wellness content is close to my heart — I share mindfulness practices, self-care routines, and product recommendations that help my audience thrive.\n\nMy community is deeply engaged and seeks out brands they can trust with their health and well-being. I'd love to introduce your brand in an authentic, meaningful way.\n\nLooking forward to this collaboration!`,
    `Hello {brand}!\n\nThe "{title}" event aligns beautifully with my wellness philosophy. As a wellness creator, I believe in sharing only what I genuinely use and believe in — and that's what makes my audience trust my recommendations.\n\nI'd love to weave your brand into my content in a way that promotes genuine well-being.\n\nExcited to connect!`,
  ],
};

const DEFAULT_TEMPLATES = [
  `Hi {brand} team!\n\nI'm excited to apply for the "{title}" event. I believe my content style and engaged audience are a great fit for what you're looking for.\n\nI'm passionate about creating authentic content that genuinely resonates with my followers, and I'd love to bring that energy to this collaboration.\n\nLooking forward to discussing this opportunity with you!`,
  `Hello {brand}!\n\nI came across the "{title}" event and immediately knew I had to apply. My content is built on authenticity and genuine audience connection, which I believe aligns well with your brand's goals.\n\nI have a track record of creating engaging content that drives real results, and I'd be thrilled to bring those skills to this event.\n\nExcited about the possibility of working together!`,
  `Hi {brand} team!\n\nThank you for the "{title}" opportunity. I'm passionate about creating content that tells real stories and builds lasting connections between brands and their audiences.\n\nMy engaged community trusts my recommendations, and I'd love to introduce your brand to them in a way that feels natural and impactful.\n\nLooking forward to hearing from you!`,
];

export function generateCoverLetterTemplate(category: string, title: string, brand: string): string {
  const pool = TEMPLATES[category] ?? DEFAULT_TEMPLATES;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx]!.replace(/\{brand\}/g, brand || 'your team').replace(/\{title\}/g, title || 'this event');
}
