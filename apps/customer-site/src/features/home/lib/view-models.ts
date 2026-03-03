export function mapHomeHeroViewModel(input: {
  title: string;
  subtitle: string;
  heroImageUrl: string;
}) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    heroImageUrl: input.heroImageUrl,
  };
}
