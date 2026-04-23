export default function MediaStrip({ media }) {
  if (!media?.length) return null

  return (
    <div>
      <h3 className="section-label mb-3">Related Media</h3>
      <div className="flex flex-wrap gap-2">
        {media.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 bg-card border border-default rounded-full px-3.5 py-1.5 text-sm transition-all duration-250 hover:border-strong" style={{boxShadow: 'var(--shadow-sm)'}}>
            {item.cover_url && (
              <img src={item.cover_url} alt={item.title} className="w-5 h-5 rounded-full object-cover" />
            )}
            <span className="font-medium text-primary">{item.title}</span>
            {item.author && <span className="text-secondary">· {item.author}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
