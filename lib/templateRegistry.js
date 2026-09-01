import ClassicGold from '../components/public-templates/ClassicGold'
import ModernBold from '../components/public-templates/ModernBold'
import Elegant from '../components/public-templates/Elegant'
import FreshSerene from '../components/public-templates/FreshSerene'
import DynamicSunrise from '../components/public-templates/DynamicSunrise'

export const templates = [
  { id: 'classic-gold', name: 'Classic Gold', component: ClassicGold, description: 'Premium & Trustworthy' },
  { id: 'modern-bold', name: 'Modern Bold', component: ModernBold, description: 'Energetic & Creative' },
  { id: 'elegant', name: 'Elegant', component: Elegant, description: 'Clean & Sophisticated' },
  { id: 'fresh-serene', name: 'Fresh Serene', component: FreshSerene, description: 'Calm & Organic' },
  { id: 'dynamic-sunrise', name: 'Dynamic Sunrise', component: DynamicSunrise, description: 'Bold & High-Energy' },
]

export function getTemplate(id) {
  return templates.find(t => t.id === id)?.component || Elegant
}
