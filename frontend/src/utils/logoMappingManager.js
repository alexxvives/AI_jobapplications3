/**
 * Logo Mapping Management Utilities
 * 
 * Use these functions in the browser console to manage company logo mappings:
 * 
 * 1. exportAllMappings() - See all current mappings
 * 2. updateMapping(companyName, newUrl) - Update a specific mapping
 * 3. getNewMappings() - See only auto-generated mappings since last update
 */

import { exportAllMappings } from './companyLogos.js'

// Update a specific company's logo mapping
export const updateMapping = (companyName, newUrl, verified = true) => {
  const normalizedKey = companyName.toLowerCase().trim()
  
  // Get existing mappings from localStorage
  const existingMappings = JSON.parse(localStorage.getItem('companyLogoMappings') || '{}')
  
  // Update the mapping
  existingMappings[normalizedKey] = {
    url: newUrl,
    verified: verified
  }
  
  // Save back to localStorage
  localStorage.setItem('companyLogoMappings', JSON.stringify(existingMappings))
  
  console.log(`✅ Updated mapping for "${companyName}": ${newUrl}`)
  
  // Also show how to copy to JSON file
  console.log('💡 To make this permanent, copy this entry to companyLogoMappings.json:')
  console.log(`"${normalizedKey}": ${JSON.stringify(existingMappings[normalizedKey], null, 2)}`)
  
  return existingMappings[normalizedKey]
}

// Get only the new auto-generated mappings
export const getNewMappings = () => {
  const storedMappings = JSON.parse(localStorage.getItem('companyLogoMappings') || '{}')
  const newMappings = {}
  
  Object.entries(storedMappings).forEach(([key, mapping]) => {
    if (!mapping.verified) {
      newMappings[key] = mapping
    }
  })
  
  console.log('🆕 New auto-generated mappings that need verification:')
  console.log(JSON.stringify(newMappings, null, 2))
  
  return newMappings
}

// Bulk update multiple mappings
export const bulkUpdateMappings = (mappingsObject) => {
  const existingMappings = JSON.parse(localStorage.getItem('companyLogoMappings') || '{}')
  
  Object.entries(mappingsObject).forEach(([companyName, url]) => {
    const normalizedKey = companyName.toLowerCase().trim()
    existingMappings[normalizedKey] = {
      url: url,
      verified: true
    }
  })
  
  localStorage.setItem('companyLogoMappings', JSON.stringify(existingMappings))
  
  console.log(`✅ Bulk updated ${Object.keys(mappingsObject).length} mappings`)
  
  return existingMappings
}

// Clear all auto-generated mappings (keep only verified ones)
export const clearAutoMappings = () => {
  const storedMappings = JSON.parse(localStorage.getItem('companyLogoMappings') || '{}')
  const verifiedMappings = {}
  
  Object.entries(storedMappings).forEach(([key, mapping]) => {
    if (mapping.verified) {
      verifiedMappings[key] = mapping
    }
  })
  
  localStorage.setItem('companyLogoMappings', JSON.stringify(verifiedMappings))
  
  console.log('🧹 Cleared all auto-generated mappings, kept verified ones')
  
  return verifiedMappings
}

// Export all mappings in a format ready for the JSON file
export const exportForJsonFile = () => {
  const allMappings = exportAllMappings()
  
  const jsonContent = {
    mappings: allMappings,
    last_updated: new Date().toISOString().split('T')[0],
    total_mappings: Object.keys(allMappings).length,
    auto_generation_enabled: true,
    notes: [
      "This file contains company name to WorldVectorLogo URL mappings",
      "You can edit the URLs manually if the auto-generated ones are incorrect",
      "Set verified: true after manually checking a logo",
      "New companies will be automatically added when encountered in job listings"
    ]
  }
  
  console.log('📋 Copy this content to companyLogoMappings.json:')
  console.log(JSON.stringify(jsonContent, null, 2))
  
  return jsonContent
}

// Global functions for browser console
if (typeof window !== 'undefined') {
  window.logoManager = {
    exportAll: exportAllMappings,
    update: updateMapping,
    getNew: getNewMappings,
    bulkUpdate: bulkUpdateMappings,
    clearAuto: clearAutoMappings,
    exportJson: exportForJsonFile
  }
  
  console.log('🎯 Logo Manager loaded! Use window.logoManager in console:')
  console.log('  logoManager.exportAll() - See all mappings')
  console.log('  logoManager.getNew() - See new auto-generated mappings')
  console.log('  logoManager.update("CompanyName", "https://...") - Update a mapping')
  console.log('  logoManager.exportJson() - Export all for JSON file')
}