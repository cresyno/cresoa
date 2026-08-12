export function Card({ children, className = '', style = {} }) {
  return (
    <section className={`cresoa-card ${className}`} style={style}>
      {children}
    </section>
  )
}
