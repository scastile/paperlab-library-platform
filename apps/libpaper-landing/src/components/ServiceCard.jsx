export default function ServiceCard({ icon, title, description, href, tint, tag, tagClass }) {
  const Icon = icon
  const isSoon = tag === 'Coming Soon'

  return (
    <a
      href={href}
      onClick={isSoon ? (e) => e.preventDefault() : undefined}
      className={`card-lift p-7 flex flex-col no-underline text-inherit ${isSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${tint}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-secondary leading-relaxed flex-1">{description}</p>
      <span className={`inline-block mt-4 text-xs font-semibold px-2.5 py-1 rounded-full self-start ${tagClass}`}>
        {tag}
      </span>
    </a>
  )
}
