/**
 * Company logo utilities
 */

// Import company logo mappings
import logoMappings from '../data/companyLogoMappings.json'

// In-memory cache to avoid repeated file writes
let mappingsCache = { ...logoMappings.mappings }
let pendingMappings = new Set()


// Handle logo loading errors by switching to default
export const handleLogoError = (event) => {
  if (event.target.src !== '/assets/logos/default-company.svg') {
    event.target.src = '/assets/logos/default-company.svg'
  }
}

// Generate a dynamic background color based on company name
export const getCompanyColor = (companyName) => {
  if (!companyName) return 'from-gray-400 to-gray-500'
  
  // Hash company name to get consistent colors
  let hash = 0
  for (let i = 0; i < companyName.length; i++) {
    hash = companyName.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Define vibrant color palettes with much stronger colors
  const colorPalettes = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600', 
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600',
    'from-orange-400 to-orange-600',
    'from-cyan-400 to-cyan-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-red-400 to-red-600',
    'from-yellow-400 to-yellow-600',
    'from-lime-400 to-lime-600',
    'from-sky-400 to-sky-600',
    'from-rose-400 to-rose-600'
  ]
  
  return colorPalettes[Math.abs(hash) % colorPalettes.length]
}

// Get company-specific brand colors for major companies
export const getBrandColor = (companyName) => {
  const brandColors = {
    'google': 'from-blue-500 to-green-500',
    'microsoft': 'from-blue-500 to-blue-700',
    'apple': 'from-gray-800 to-black',
    'amazon': 'from-orange-400 to-yellow-500',
    'meta': 'from-blue-500 to-purple-600',
    'facebook': 'from-blue-500 to-blue-700',
    'netflix': 'from-red-600 to-red-700',
    'airbnb': 'from-pink-500 to-red-500',
    'uber': 'from-black to-gray-800',
    'spotify': 'from-green-500 to-green-600',
    'twitter': 'from-blue-400 to-blue-500',
    'linkedin': 'from-blue-600 to-blue-700',
    'slack': 'from-purple-500 to-pink-500',
    'zoom': 'from-blue-500 to-blue-600',
    'shopify': 'from-green-500 to-green-600',
    'stripe': 'from-purple-600 to-blue-600',
    'figma': 'from-purple-500 to-pink-500',
    'notion': 'from-gray-800 to-black',
    'openai': 'from-green-400 to-teal-500',
    'binance': 'from-yellow-400 to-orange-500',
    'back market': 'from-green-500 to-teal-600',
    'bazaarvoice': 'from-blue-500 to-purple-600'
  }
  
  const normalized = companyName.toLowerCase().trim()
  return brandColors[normalized] || getCompanyColor(companyName)
}

// Get real company logo URL with multiple sources for best color results
export const getCompanyLogoUrl = (companyName) => {
  if (!companyName) {
    return '/assets/logos/default-company.svg'
  }
  
  const normalizedKey = companyName.toLowerCase().trim()
  
  // Check if we have a verified mapping first
  if (mappingsCache[normalizedKey]) {
    return mappingsCache[normalizedKey].url
  }
  
  // Auto-generate mapping for new companies
  addNewCompanyMapping(companyName)
  
  // Format: lowercase, spaces to hyphens, remove special chars
  const normalizedName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars but keep spaces
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/-+/g, '-')         // Remove multiple consecutive hyphens
    .replace(/^-|-$/g, '')       // Remove leading/trailing hyphens
  
  // Try with -logo suffix first (often better quality)
  return `https://worldvectorlogo.com/logo/${normalizedName}-logo`
}

// No color filter needed - we want original colors
export const getLogoColorFilter = (companyName) => {
  return {
    filter: 'none', // Keep original colors
    transition: 'filter 0.3s ease'
  }
}

// Get brand colors for companies
const getCompanyBrandColor = (companyName) => {
  const brandColors = {
    'google': '4285f4',
    'microsoft': '0078d4', 
    'apple': '000000',
    'amazon': 'ff9900',
    'meta': '1877f2',
    'facebook': '1877f2',
    'netflix': 'e50914',
    'airbnb': 'ff5a5f',
    'uber': '000000',
    'spotify': '1db954',
    'twitter': '1da1f2',
    'linkedin': '0a66c2',
    'slack': '4a154b',
    'zoom': '2d8cff',
    'shopify': '7ab55c',
    'stripe': '635bff',
    'figma': 'f24e1e',
    'notion': '000000',
    'openai': '10a37f',
    'binance': 'f0b90b',
    'back market': '00d4aa',
    'backmarket': '00d4aa',
    'bazaarvoice': '2e5bff'
  }
  
  const normalized = companyName.toLowerCase().trim()
  
  // Try exact match first
  if (brandColors[normalized]) {
    return brandColors[normalized]
  }
  
  // Try without spaces
  const withoutSpaces = normalized.replace(/\s+/g, '')
  if (brandColors[withoutSpaces]) {
    return brandColors[withoutSpaces]
  }
  
  // Generate consistent color from company name
  let hash = 0
  for (let i = 0; i < companyName.length; i++) {
    hash = companyName.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Convert to hex color (vibrant colors only)
  const vibrantColors = [
    '3b82f6', 'ef4444', '10b981', 'f59e0b', '8b5cf6',
    'ec4899', '06b6d4', '84cc16', 'f97316', '6366f1'
  ]
  
  return vibrantColors[Math.abs(hash) % vibrantColors.length]
}

// Handle logo loading errors with multiple fallback sources
export const handleLogoErrorWithFallbacks = (event, companyName) => {
  const img = event.target
  const currentSrc = img.src
  
  if (!companyName) {
    img.src = '/assets/logos/default-company.svg'
    return
  }
  
  const domain = getCompanyDomain(companyName)
  const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  
  // Define fallback chain for real color logos (prioritize -logo suffix for better quality)
  const fallbackSources = [
    `https://worldvectorlogo.com/logo/${normalizedName}-logo`,  // Primary: with -logo suffix
    `https://worldvectorlogo.com/logo/${normalizedName}`,       // Fallback: without -logo suffix
    `https://logo.clearbit.com/${domain}?size=128&format=png`,
    `https://logos-world.net/wp-content/uploads/2020/04/${companyName.replace(/\s+/g, '-')}-Logo.png`,
    `https://companiesmarketcap.com/img/company-logos/256/${domain.replace('.com', '')}.png`,
    '/assets/logos/default-company.svg'
  ]
  
  // Find current source and try next one
  let currentIndex = -1
  for (let i = 0; i < fallbackSources.length; i++) {
    if (currentSrc.includes(fallbackSources[i].split('?')[0].split('/').pop().split('.')[0])) {
      currentIndex = i
      break
    }
  }
  
  const nextIndex = currentIndex + 1
  
  // Try next source
  if (nextIndex < fallbackSources.length) {
    img.src = fallbackSources[nextIndex]
  } else {
    // Last resort: default logo
    img.src = '/assets/logos/default-company.svg'
  }
}

// Map company names to their domains for Clearbit API
const getCompanyDomain = (companyName) => {
  const domainMapping = {
    'google': 'google.com',
    'microsoft': 'microsoft.com',
    'apple': 'apple.com',
    'amazon': 'amazon.com',
    'meta': 'meta.com',
    'facebook': 'facebook.com',
    'netflix': 'netflix.com',
    'airbnb': 'airbnb.com',
    'uber': 'uber.com',
    'spotify': 'spotify.com',
    'twitter': 'twitter.com',
    'linkedin': 'linkedin.com',
    'slack': 'slack.com',
    'zoom': 'zoom.us',
    'shopify': 'shopify.com',
    'stripe': 'stripe.com',
    'figma': 'figma.com',
    'notion': 'notion.so',
    'openai': 'openai.com',
    'binance': 'binance.com',
    'back market': 'backmarket.com',
    'backmarket': 'backmarket.com',
    'bazaarvoice': 'bazaarvoice.com',
    // Companies we know are in the database
    'binance': 'binance.com',
    'back market': 'backmarket.com',
    'bazaarvoice': 'bazaarvoice.com'
  }
  
  const normalized = companyName.toLowerCase().trim()
  
  // If we have a direct mapping, use it
  if (domainMapping[normalized]) {
    return domainMapping[normalized]
  }
  
  // For company names with spaces, try without spaces first
  const withoutSpaces = normalized.replace(/\s+/g, '')
  if (domainMapping[withoutSpaces]) {
    return domainMapping[withoutSpaces]
  }
  
  // Default: company name + .com
  return `${withoutSpaces}.com`
}

// Add new company mapping and persist to local storage for manual editing
const addNewCompanyMapping = (companyName) => {
  const normalizedKey = companyName.toLowerCase().trim()
  
  // Skip if already exists or already pending
  if (mappingsCache[normalizedKey] || pendingMappings.has(normalizedKey)) {
    return
  }
  
  // Add to pending to avoid duplicates
  pendingMappings.add(normalizedKey)
  
  // Generate the auto-mapping
  const normalizedName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  const newMapping = {
    url: `https://worldvectorlogo.com/logo/${normalizedName}-logo`,
    verified: false
  }
  
  // Add to cache
  mappingsCache[normalizedKey] = newMapping
  
  // Save to localStorage for persistence (you can manually copy to the JSON file)
  const existingMappings = JSON.parse(localStorage.getItem('companyLogoMappings') || '{}')
  existingMappings[normalizedKey] = newMapping
  localStorage.setItem('companyLogoMappings', JSON.stringify(existingMappings))
  
  console.log(`📝 Auto-generated logo mapping for "${companyName}":`, newMapping.url)
}

// Export function to get all mappings for manual editing
export const exportAllMappings = () => {
  const allMappings = {
    ...logoMappings.mappings,
    ...JSON.parse(localStorage.getItem('companyLogoMappings') || '{}')
  }
  
  console.log('🗂️ All company logo mappings:')
  console.log(JSON.stringify({
    mappings: allMappings,
    last_updated: new Date().toISOString().split('T')[0],
    total_mappings: Object.keys(allMappings).length,
    auto_generation_enabled: true
  }, null, 2))
  
  return allMappings
}