import ClassicGold from './ClassicGold'
import ModernBold from './ModernBold'
import Elegant from './Elegant'
import FreshSerene from './FreshSerene'
import DynamicSunrise from './DynamicSunrise'
import LuxuryGold from './LuxuryGold'
import MinimalPro from './MinimalPro'
import CreativeStudio from './CreativeStudio'

export const templates = [
  { id: 'classic-gold', name: 'Classic Gold', component: ClassicGold, description: 'Premium & Trustworthy', preview: 'linear-gradient(135deg, #D4AF37, #F5E6A8)' },
  { id: 'modern-bold', name: 'Modern Bold', component: ModernBold, description: 'Energetic & Creative', preview: 'linear-gradient(135deg, #0F2B4A, #1A3F66)' },
  { id: 'elegant', name: 'Elegant', component: Elegant, description: 'Clean & Sophisticated', preview: 'linear-gradient(135deg, #D4A52A, #0F2B4A)' },
  { id: 'fresh-serene', name: 'Fresh Serene', component: FreshSerene, description: 'Calm & Organic', preview: 'linear-gradient(135deg, #A8D8EA, #AA96DA)' },
  { id: 'dynamic-sunrise', name: 'Dynamic Sunrise', component: DynamicSunrise, description: 'Bold & High-Energy', preview: 'linear-gradient(135deg, #FFD194, #FF7E5F)' },
  { id: 'luxury-gold', name: 'Luxury Gold', component: LuxuryGold, description: 'Opulent & Timeless', preview: 'linear-gradient(135deg, #1a1a1a, #D4AF37)' },
  { id: 'minimal-pro', name: 'Minimal Pro', component: MinimalPro, description: 'Modern & Clean', preview: 'linear-gradient(135deg, #f5f5f5, #333)' },
  { id: 'creative-studio', name: 'Creative Studio', component: CreativeStudio, description: 'Vibrant & Playful', preview: 'linear-gradient(135deg, #FF6B6B, #FFE66D)' },
]

export function getTemplate(id) {
  return templates.find(t => t.id === id)?.component || Elegant
}

export function getTemplatePreview(id) {
  return templates.find(t => t.id === id)?.preview || 'linear-gradient(135deg, #D4A52A, #0F2B4A)'
}
