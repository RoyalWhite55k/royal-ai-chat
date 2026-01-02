export function renderTemplate(
  content: string,
  vars: { role: string; goal: string; context: string }
) {
  return (content ?? '').replace(/\{(role|goal|context)\}/g, (_, key) => {
    const v = (vars as any)[key] ?? ''
    return String(v)
  })
}
