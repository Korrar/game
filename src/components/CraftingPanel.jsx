import { getIconUrl } from "../rendering/icons";

const RARITY_COLOR = { common: "#a09878", uncommon: "#40a8b8", rare: "#a050e0" };

function IngredientRow({ resourceId, needed, owned }) {
  const has = (owned[resourceId] || 0);
  const ok = has >= needed;
  return (
    <span style={{ color: ok ? "#60d060" : "#cc4040", fontSize: 10 }}>
      {has}/{needed}
    </span>
  );
}

export default function CraftingPanel({ biome, resources, consumables, recipes, resourceNames = {}, onCraft, onUseConsumable, onClose, isMobile }) {
  if (!biome || !recipes) return null;

  const sz = isMobile ? 18 : 22;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 190,
      background: "rgba(0,0,0,0.80)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: isMobile ? 8 : 20,
    }} onClick={onClose}>
      <div style={{
        background: "linear-gradient(180deg, #1a0e08 0%, #0e0806 100%)",
        border: "2px solid #8b6030",
        borderRadius: 10, padding: isMobile ? 10 : 16,
        width: isMobile ? "100%" : 540, maxHeight: "80vh",
        overflowY: "auto", position: "relative",
        boxShadow: "0 0 40px #8b603040",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: "bold", color: "#d4a030", letterSpacing: 2 }}>
            ⚗ KUŹNIA — {biome.name?.toUpperCase()}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid #553020", color: "#888",
            borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12,
          }}>✕</button>
        </div>

        {/* Resource inventory */}
        {Object.keys(resources).length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 6,
            padding: "6px 8px", marginBottom: 12,
            display: "flex", flexWrap: "wrap", gap: 6,
          }}>
            <div style={{ fontSize: 9, color: "#777", width: "100%", marginBottom: 2, letterSpacing: 1 }}>SUROWCE</div>
            {Object.entries(resources).filter(([, v]) => v > 0).map(([id, count]) => (
              <div key={id} style={{
                fontSize: 10, color: "#c0a060", background: "rgba(212,160,48,0.1)",
                border: "1px solid #8b603040", borderRadius: 4, padding: "2px 6px",
              }}>
                {resourceNames[id] || id.replace(/_/g, " ")} ×{count}
              </div>
            ))}
          </div>
        )}

        {/* Crafted consumables ready to use */}
        {consumables.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#777", letterSpacing: 1, marginBottom: 4 }}>GOTOWE DO UŻYCIA</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {consumables.map(c => (
                <div
                  key={c.id}
                  title={c.desc}
                  onClick={() => onUseConsumable(c.id)}
                  style={{
                    cursor: "pointer", background: "rgba(100,200,100,0.1)",
                    border: "1px solid #44884440", borderRadius: 6, padding: "4px 8px",
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: "#80ff80",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(100,200,100,0.22)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(100,200,100,0.1)"}
                >
                  {getIconUrl(c.icon, 16)
                    ? <img src={getIconUrl(c.icon, 16)} width={16} height={16} alt="" />
                    : <span>🧪</span>}
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recipes */}
        {recipes.length === 0 ? (
          <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 20 }}>
            Brak receptur dla tego biomu.<br />
            <span style={{ fontSize: 10 }}>Zbierz surowce w innym biomie.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recipes.map(recipe => {
              const craftable = recipe.ingredients.every(ing => (resources[ing.resourceId] || 0) >= ing.amount);
              return (
                <div key={recipe.id} style={{
                  background: craftable ? "rgba(60,140,60,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${craftable ? "#448844" : "#333"}`,
                  borderRadius: 7, padding: isMobile ? "8px 10px" : "10px 14px",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  {/* Icon */}
                  <div style={{ flex: "0 0 auto" }}>
                    {getIconUrl(recipe.icon, sz)
                      ? <img src={getIconUrl(recipe.icon, sz)} width={sz} height={sz} alt="" />
                      : <span style={{ fontSize: sz }}>⚗</span>}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: "bold", color: craftable ? "#c0e0a0" : "#888" }}>
                      {recipe.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#666", marginTop: 1 }}>{recipe.desc}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      {recipe.ingredients.map(ing => (
                        <span key={ing.resourceId} style={{ fontSize: 10, color: "#a09878" }}>
                          {resourceNames[ing.resourceId] || ing.resourceId.replace(/_/g, " ")} (
                          <IngredientRow resourceId={ing.resourceId} needed={ing.amount} owned={resources} />
                          )
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Craft button */}
                  <button
                    onClick={() => craftable && onCraft(recipe)}
                    disabled={!craftable}
                    style={{
                      flex: "0 0 auto",
                      background: craftable ? "linear-gradient(180deg,#3a8a3a,#256025)" : "#222",
                      border: `1px solid ${craftable ? "#5ab05a" : "#444"}`,
                      color: craftable ? "#c0ffc0" : "#555",
                      borderRadius: 6, padding: isMobile ? "5px 10px" : "6px 14px",
                      cursor: craftable ? "pointer" : "not-allowed",
                      fontSize: isMobile ? 10 : 11, fontWeight: "bold", letterSpacing: 1,
                      transition: "filter 0.15s",
                    }}
                    onMouseEnter={e => craftable && (e.currentTarget.style.filter = "brightness(1.2)")}
                    onMouseLeave={e => (e.currentTarget.style.filter = "none")}
                  >
                    STWÓRZ
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
