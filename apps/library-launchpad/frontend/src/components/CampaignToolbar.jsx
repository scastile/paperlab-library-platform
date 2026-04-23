import { Save, Download } from 'lucide-react'

export default function CampaignToolbar({ campaign, onSave, onExport }) {
  if (!campaign) return null

  return (
    <div className="flex items-center justify-between bg-card rounded-xl px-5 py-4 border border-default" style={{boxShadow: 'var(--shadow-sm)'}}>
      <div>
        <h3 className="text-sm font-semibold text-primary">
          Campaign: <span className="accent-solid">{campaign.topic}</span>
        </h3>
        <p className="text-xs text-tertiary mt-0.5">
          {campaign.cards?.length || 0} cards · {campaign.cards?.filter(c => c.pinned).length || 0} pinned
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="btn-gradient flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-medium"
        >
          <Save className="w-3.5 h-3.5" />
          Save Campaign
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-xs bg-hover text-secondary hover:text-primary border border-default px-3.5 py-2 rounded-lg transition-all duration-250 font-medium"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </button>
      </div>
    </div>
  )
}
