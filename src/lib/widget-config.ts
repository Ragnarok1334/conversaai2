export function sanitizeWidgetConfigForPlan(widgetConfig: any, effectivePlan: string) {
  if (typeof widgetConfig !== 'object' || Array.isArray(widgetConfig) || widgetConfig === null) {
    return {}
  }

  const isPro = effectivePlan === 'pro'
  const isGrowthOrAbove = effectivePlan === 'growth' || effectivePlan === 'business' || effectivePlan === 'enterprise'

  const canUseSubtitle = isPro || isGrowthOrAbove
  const canUseLauncherText = isPro || isGrowthOrAbove
  const canUseQuickQuestions = isPro || isGrowthOrAbove
  const canUseThemeAndSecondary = isGrowthOrAbove

  const cleanConfig: Record<string, any> = {}
  const sanitizeText = (txt: any) => typeof txt === 'string' ? txt.replace(/[<>]/g, '').trim() : ''
  const isValidHex = (hex: any) => typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/i.test(hex)

  // Starter (and all paid plans)
  if (widgetConfig.displayName) cleanConfig.displayName = sanitizeText(widgetConfig.displayName).slice(0, 60)
  if (widgetConfig.welcomeMessage) cleanConfig.welcomeMessage = sanitizeText(widgetConfig.welcomeMessage).slice(0, 240)
  if (isValidHex(widgetConfig.primaryColor)) cleanConfig.primaryColor = widgetConfig.primaryColor
  
  if (widgetConfig.position && ['bottom-right', 'bottom-left'].includes(widgetConfig.position)) {
    cleanConfig.position = widgetConfig.position
  }

  if (widgetConfig.launcherMode && ['icon', 'icon-text'].includes(widgetConfig.launcherMode)) {
    cleanConfig.launcherMode = widgetConfig.launcherMode
  }

  // Pro & Growth+
  if (canUseSubtitle && widgetConfig.subtitle) cleanConfig.subtitle = sanitizeText(widgetConfig.subtitle).slice(0, 90)
  if (canUseLauncherText && widgetConfig.launcherText) cleanConfig.launcherText = sanitizeText(widgetConfig.launcherText).slice(0, 40)
  
  if (canUseQuickQuestions && Array.isArray(widgetConfig.quickQuestions)) {
    cleanConfig.quickQuestions = widgetConfig.quickQuestions
      .map(sanitizeText)
      .filter((q: string) => q.length > 0)
      .slice(0, 4)
      .map((q: string) => q.slice(0, 80))
  }

  // Growth+ only
  if (canUseThemeAndSecondary && isValidHex(widgetConfig.secondaryColor)) {
    cleanConfig.secondaryColor = widgetConfig.secondaryColor
  }
  
  if (canUseThemeAndSecondary && widgetConfig.theme && ['modern', 'minimal', 'premium'].includes(widgetConfig.theme)) {
    cleanConfig.theme = widgetConfig.theme
  } else {
    cleanConfig.theme = 'modern'
  }

  return cleanConfig
}
