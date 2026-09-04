import ClassicGold from '../components/public-templates/ClassicGold'
import ModernBold from '../components/public-templates/ModernBold'
import Elegant from '../components/public-templates/Elegant'
import FreshSerene from '../components/public-templates/FreshSerene'
import DynamicSunrise from '../components/public-templates/DynamicSunrise'
import LuxuryGold from '../components/public-templates/LuxuryGold'
import MinimalPro from '../components/public-templates/MinimalPro'
import CreativeStudio from '../components/public-templates/CreativeStudio'

const templateMap = {
  'classic-gold': ClassicGold,
  'modern-bold': ModernBold,
  'elegant': Elegant,
  'fresh-serene': FreshSerene,
  'dynamic-sunrise': DynamicSunrise,
  'luxury-gold': LuxuryGold,
  'minimal-pro': MinimalPro,
  'creative-studio': CreativeStudio,
}

const ActiveTemplate = templateMap[templateId] || Elegant
export function getTemplate(id) {
  return templates.find(t => t.id === id)?.component || Elegant
}
