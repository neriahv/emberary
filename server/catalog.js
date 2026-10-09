// What the Library Room shop sells, and what Ember is earned for.
//
// Kept IDENTICAL in server/catalog.js and client/src/api/catalog.js. The server
// is deployed on its own and cannot import from the client, and the client
// shows prices without asking the server. The server is the authority on price
// and balance; the catalog parity test fails if the two copies ever differ.

// "build" categories change the room itself; "furnish" ones stand in it. The
// loft and roofs are not sold for now; rooms that already have one keep it.
export const SHOP_CATEGORIES = [
  { id: 'windows', label: 'Windows', section: 'build' },
  { id: 'wallShape', label: 'Wall tops', section: 'build' },
  { id: 'wallpaper', label: 'Wallpaper', section: 'build' },
  { id: 'floors', label: 'Floors', section: 'build' },

  { id: 'bookshelves', label: 'Bookshelves', section: 'furnish' },
  { id: 'tables', label: 'Tables', section: 'furnish' },
  { id: 'chairs', label: 'Seating', section: 'furnish' },
  { id: 'lamps', label: 'Lights', section: 'furnish' },
  { id: 'rugs', label: 'Rugs', section: 'furnish' },
  { id: 'plants', label: 'Plants', section: 'furnish' },
  { id: 'decor', label: 'Decorations', section: 'furnish' },
  { id: 'stairs', label: 'Stairs', section: 'furnish' },
]

// type "item" is bought one at a time, stands in the room and can be moved
// (a window hangs on a wall). Every other type is a finish: bought once,
// then chosen for the room, one of each type at a time. The room setting it
// changes has the same name as the type. A price of 0 means every room
// already has it.
//
//   holds:   a bookcase ("shelves") or a table or seat ("table") the reader's
//            books can stand on
//   wall:    it hangs on a wall
//   small:   it can stand on a table, a shelf or a seat as well as the floor
//   builtIn: every room starts with one; never sold in the shop, but it can
//            be stored or sold back like anything else
//   stairwell: a staircase; how far its footprint reaches [across, along]
//            from its middle, so an upstairs floor leaves an opening for it
export const CATALOG = [
  // ---------------------------------------------------------------- build
  { id: 'window-round', category: 'windows', type: 'item', name: 'Round window', price: 4, wall: true },
  { id: 'window-paned', category: 'windows', type: 'item', name: 'Tall paned window', price: 5, wall: true },
  { id: 'window-octagon', category: 'windows', type: 'item', name: 'Octagon window', price: 6, wall: true },
  { id: 'window-cathedral', category: 'windows', type: 'item', name: 'Cathedral window', price: 8, wall: true },
  { id: 'window-arcade', category: 'windows', type: 'item', name: 'Open arches', price: 10, wall: true },
  { id: 'window-lancet', category: 'windows', type: 'item', name: 'Noble lancet window', price: 14, wall: true },
  { id: 'window-cottage', category: 'windows', type: 'item', name: 'Leaded cottage window', price: 10, wall: true },
  { id: 'window-french', category: 'windows', type: 'item', name: 'Arched French window', price: 16, wall: true },
  { id: 'window-sakura', category: 'windows', type: 'item', name: 'Sakura pillar window', price: 16, wall: true },
  { id: 'window-stone', category: 'windows', type: 'item', name: 'Stone arched window', price: 12, wall: true },

  { id: 'loft-none', category: 'loft', type: 'loft', name: 'No loft', price: 0 },
  { id: 'loft-gallery', category: 'loft', type: 'loft', name: 'Reading loft', price: 40 },

  { id: 'shape-straight', category: 'wallShape', type: 'wallShape', name: 'Straight top', price: 0 },
  { id: 'shape-gable', category: 'wallShape', type: 'wallShape', name: 'Cottage gable', price: 10 },
  { id: 'shape-arch', category: 'wallShape', type: 'wallShape', name: 'Grand arch', price: 12 },
  { id: 'shape-castle', category: 'wallShape', type: 'wallShape', name: 'Castle battlements', price: 12 },
  { id: 'shape-wave', category: 'wallShape', type: 'wallShape', name: 'Scalloped edge', price: 10 },
  { id: 'shape-steps', category: 'wallShape', type: 'wallShape', name: 'Stepped gable', price: 12 },
  { id: 'shape-spires', category: 'wallShape', type: 'wallShape', name: 'Gothic spires', price: 14 },
  { id: 'shape-crown', category: 'wallShape', type: 'wallShape', name: 'Royal crown', price: 14 },
  { id: 'shape-cloud', category: 'wallShape', type: 'wallShape', name: 'Cloud puffs', price: 10 },
  { id: 'shape-twin', category: 'wallShape', type: 'wallShape', name: 'Twin gables', price: 12 },

  { id: 'roof-open', category: 'roof', type: 'roof', name: 'Open to the sky', price: 0 },
  { id: 'roof-beams', category: 'roof', type: 'roof', name: 'Timber beams', price: 10 },
  { id: 'roof-ivy', category: 'roof', type: 'roof', name: 'Trailing ivy', price: 10 },
  { id: 'roof-slate', category: 'roof', type: 'roof', name: 'Slate eaves', price: 14 },
  { id: 'roof-glass', category: 'roof', type: 'roof', name: 'Glass conservatory', price: 16 },

  { id: 'wallpaper-plain', category: 'wallpaper', type: 'wallpaper', name: 'Plain paint', price: 0 },
  { id: 'wallpaper-stripes', category: 'wallpaper', type: 'wallpaper', name: 'Regency stripes', price: 3 },
  { id: 'wallpaper-trellis', category: 'wallpaper', type: 'wallpaper', name: 'Diamond trellis', price: 3 },
  { id: 'wallpaper-sprig', category: 'wallpaper', type: 'wallpaper', name: 'Sprig print', price: 3 },
  { id: 'wallpaper-panels', category: 'wallpaper', type: 'wallpaper', name: 'Wood panelling', price: 4 },
  { id: 'wallpaper-brick', category: 'wallpaper', type: 'wallpaper', name: 'Painted brick', price: 4 },
  { id: 'wallpaper-leaves', category: 'wallpaper', type: 'wallpaper', name: 'Falling leaves', price: 4 },
  { id: 'wallpaper-floral', category: 'wallpaper', type: 'wallpaper', name: 'Pastel florals', price: 4 },
  { id: 'wallpaper-stars', category: 'wallpaper', type: 'wallpaper', name: 'Constellations', price: 5 },
  { id: 'wallpaper-stone', category: 'wallpaper', type: 'wallpaper', name: 'Castle stone', price: 6 },
  { id: 'wallpaper-subway', category: 'wallpaper', type: 'wallpaper', name: 'Subway tiles', price: 4 },
  { id: 'wallpaper-ceramic', category: 'wallpaper', type: 'wallpaper', name: 'Ceramic tiles', price: 4 },
  { id: 'wallpaper-waves', category: 'wallpaper', type: 'wallpaper', name: 'Seigaiha waves', price: 5 },
  { id: 'wallpaper-shoji', category: 'wallpaper', type: 'wallpaper', name: 'Shoji screens', price: 5 },
  { id: 'wallpaper-burlap', category: 'wallpaper', type: 'wallpaper', name: 'Woven burlap', price: 3 },
  { id: 'wallpaper-cement', category: 'wallpaper', type: 'wallpaper', name: 'Polished cement', price: 3 },
  { id: 'wallpaper-damask', category: 'wallpaper', type: 'wallpaper', name: 'Damask', price: 5 },

  { id: 'floor-planks', category: 'floors', type: 'floor', name: 'Oak planks', price: 0 },
  { id: 'floor-checker', category: 'floors', type: 'floor', name: 'Checkerboard tiles', price: 3 },
  { id: 'floor-herringbone', category: 'floors', type: 'floor', name: 'Herringbone parquet', price: 4 },
  { id: 'floor-stone', category: 'floors', type: 'floor', name: 'Stone flags', price: 4 },
  { id: 'floor-terracotta', category: 'floors', type: 'floor', name: 'Terracotta hexagons', price: 4 },
  { id: 'floor-moss', category: 'floors', type: 'floor', name: 'Mossy flagstones', price: 5 },
  { id: 'floor-marble', category: 'floors', type: 'floor', name: 'Rose marble', price: 5 },
  { id: 'floor-castle', category: 'floors', type: 'floor', name: 'Castle stone floor', price: 6 },
  { id: 'floor-cobble', category: 'floors', type: 'floor', name: 'Cobblestones', price: 5 },
  { id: 'floor-granite', category: 'floors', type: 'floor', name: 'Speckled granite', price: 4 },
  { id: 'floor-ceramic', category: 'floors', type: 'floor', name: 'Ceramic tiles', price: 4 },
  { id: 'floor-wideplanks', category: 'floors', type: 'floor', name: 'Wide pine planks', price: 3 },
  { id: 'floor-blackmarble', category: 'floors', type: 'floor', name: 'Black marble', price: 6 },
  { id: 'floor-sisal', category: 'floors', type: 'floor', name: 'Sisal matting', price: 3 },
  { id: 'floor-tatami', category: 'floors', type: 'floor', name: 'Tatami mats', price: 5 },

  // ---------------------------------------------------------------- furnish
  { id: 'built-in-bookcase', category: 'bookshelves', type: 'item', name: 'Built-in bookcase', price: 16, holds: 'shelves', builtIn: true },
  { id: 'built-in-shelf', category: 'bookshelves', type: 'item', name: 'Old volumes shelf', price: 8, builtIn: true },
  { id: 'bookcase-small', category: 'bookshelves', type: 'item', name: 'Small bookcase', price: 6, holds: 'shelves' },
  { id: 'bookcase-tall', category: 'bookshelves', type: 'item', name: 'Tall bookcase', price: 10, holds: 'shelves' },
  { id: 'bookcase-wall', category: 'bookshelves', type: 'item', name: 'Floor-to-ceiling bookcase', price: 22, holds: 'shelves' },
  { id: 'bookcase-crate', category: 'bookshelves', type: 'item', name: 'Apple-crate shelves', price: 6, holds: 'shelves' },
  { id: 'bookcase-pastel', category: 'bookshelves', type: 'item', name: 'Blush bookcase', price: 8, holds: 'shelves' },
  { id: 'bookcase-birch', category: 'bookshelves', type: 'item', name: 'Birch & ivy bookcase', price: 10, holds: 'shelves' },
  { id: 'bookcase-arched', category: 'bookshelves', type: 'item', name: 'Arched midnight bookcase', price: 14, holds: 'shelves' },
  { id: 'mint-bookcase', category: 'bookshelves', type: 'item', name: 'Sage & cream bookcase', price: 20, holds: 'shelves' },
  { id: 'wizard-bookcase', category: 'bookshelves', type: 'item', name: "Wizard's arched bookcase", price: 24, holds: 'shelves' },
  { id: 'potion-cabinet', category: 'bookshelves', type: 'item', name: 'Potion cabinet', price: 20, holds: 'shelves' },
  { id: 'gothic-bookcase', category: 'bookshelves', type: 'item', name: 'Gothic velvet bookcase', price: 22, holds: 'shelves' },
  { id: 'shoji-bookcase', category: 'bookshelves', type: 'item', name: 'Shoji bookcase', price: 16, holds: 'shelves' },
  { id: 'cottage-bookcase', category: 'bookshelves', type: 'item', name: 'Cottage house bookcase', price: 14, holds: 'shelves' },
  { id: 'library-stack', category: 'bookshelves', type: 'item', name: 'Library stack', price: 16, holds: 'shelves' },
  { id: 'minimal-bookcase', category: 'bookshelves', type: 'item', name: 'Minimal white bookcase', price: 12, holds: 'shelves' },
  { id: 'lavender-bookcase', category: 'bookshelves', type: 'item', name: 'Lavender reading wall', price: 18, holds: 'shelves' },
  { id: 'bubble-shelf', category: 'bookshelves', type: 'item', name: 'Bubble cloud shelf', price: 14, holds: 'shelves' },
  { id: 'rocket-bookcase', category: 'bookshelves', type: 'item', name: 'Rocket bookcase', price: 20, holds: 'shelves' },

  { id: 'side-table', category: 'tables', type: 'item', name: 'Pedestal table', price: 2, holds: 'table' },
  { id: 'coffee-table', category: 'tables', type: 'item', name: 'Coffee table', price: 2, holds: 'table' },
  { id: 'desk', category: 'tables', type: 'item', name: 'Writing desk', price: 4, holds: 'table' },
  { id: 'dresser', category: 'tables', type: 'item', name: 'Chest of drawers', price: 4, holds: 'table' },
  { id: 'reading-table', category: 'tables', type: 'item', name: 'Library table & green lamp', price: 6, holds: 'table' },
  { id: 'tea-table', category: 'tables', type: 'item', name: 'Gingham tea table', price: 3, holds: 'table' },
  { id: 'pastel-desk', category: 'tables', type: 'item', name: 'Cream study desk', price: 5, holds: 'table' },
  { id: 'stump-table', category: 'tables', type: 'item', name: 'Tree-stump table', price: 3, holds: 'table' },
  { id: 'moon-table', category: 'tables', type: 'item', name: 'Crescent moon table', price: 4, holds: 'table' },
  { id: 'wooden-desk', category: 'tables', type: 'item', name: 'Honey-wood desk', price: 22, holds: 'table' },
  { id: 'orrery-table', category: 'tables', type: 'item', name: 'Orrery table', price: 26 },
  { id: 'crystal-altar', category: 'tables', type: 'item', name: 'Crystal altar', price: 24 },
  { id: 'librarian-desk', category: 'tables', type: 'item', name: "Librarian's desk", price: 20, holds: 'table' },
  { id: 'study-table', category: 'tables', type: 'item', name: 'Group study table', price: 18, holds: 'table' },
  { id: 'pebble-table', category: 'tables', type: 'item', name: 'Pebble coffee table', price: 10, holds: 'table' },
  { id: 'card-catalog', category: 'tables', type: 'item', name: 'Card catalogue', price: 16, holds: 'table' },
  { id: 'mint-cabinet', category: 'tables', type: 'item', name: 'Mint book cabinet', price: 14, holds: 'table' },
  { id: 'coffee-corner', category: 'tables', type: 'item', name: 'Library coffee corner', price: 18, holds: 'table' },

  { id: 'stool', category: 'chairs', type: 'item', name: 'Wooden stool', price: 1 },
  { id: 'chair', category: 'chairs', type: 'item', name: 'Wooden chair', price: 1 },
  { id: 'cushion', category: 'chairs', type: 'item', name: 'Floor cushion', price: 1 },
  { id: 'armchair', category: 'chairs', type: 'item', name: 'Armchair', price: 3, holds: 'table' },
  { id: 'rocking-chair', category: 'chairs', type: 'item', name: 'Rocking chair', price: 3 },
  { id: 'wingback', category: 'chairs', type: 'item', name: 'Red wingback chair', price: 4, holds: 'table' },
  { id: 'sofa', category: 'chairs', type: 'item', name: 'Chesterfield sofa', price: 5, holds: 'table' },
  { id: 'plaid-armchair', category: 'chairs', type: 'item', name: 'Plaid armchair', price: 4, holds: 'table' },
  { id: 'pink-chair', category: 'chairs', type: 'item', name: 'Pink desk chair', price: 2 },
  { id: 'pouf', category: 'chairs', type: 'item', name: 'Mint pouf', price: 1 },
  { id: 'stump-stool', category: 'chairs', type: 'item', name: 'Log stool', price: 1 },
  { id: 'velvet-sofa', category: 'chairs', type: 'item', name: 'Violet velvet sofa', price: 6, holds: 'table' },
  { id: 'office-chair', category: 'chairs', type: 'item', name: 'Tangerine desk chair', price: 18 },
  { id: 'egg-chair', category: 'chairs', type: 'item', name: 'Coral egg chair', price: 24, holds: 'table' },
  { id: 'petal-chair', category: 'chairs', type: 'item', name: 'Lilac petal chair', price: 28, holds: 'table' },
  { id: 'avocado-swing', category: 'chairs', type: 'item', name: 'Avocado swing chair', price: 30, holds: 'table' },
  { id: 'wizard-armchair', category: 'chairs', type: 'item', name: "Wizard's armchair", price: 22, holds: 'table' },
  { id: 'nouveau-chair', category: 'chairs', type: 'item', name: 'Nouveau velvet chair', price: 16 },
  { id: 'velvet-tub-chair', category: 'chairs', type: 'item', name: 'Velvet tub chair', price: 18, holds: 'table' },
  { id: 'swan-chair', category: 'chairs', type: 'item', name: 'Swan-back chair', price: 16 },
  { id: 'rust-sofa', category: 'chairs', type: 'item', name: 'Rust velvet sofa', price: 20, holds: 'table' },
  { id: 'boucle-chair', category: 'chairs', type: 'item', name: 'Bouclé tub chair', price: 14, holds: 'table' },
  { id: 'window-seat', category: 'chairs', type: 'item', name: 'Window reading seat', price: 16, holds: 'table' },
  { id: 'canopy-nest', category: 'chairs', type: 'item', name: 'Canopy reading nest', price: 24, holds: 'table' },
  { id: 'daisy-pillow', category: 'chairs', type: 'item', name: 'Daisy floor pillow', price: 6 },
  { id: 'pleated-pouf', category: 'chairs', type: 'item', name: 'Pleated pink pouf', price: 8 },
  { id: 'bean-bag', category: 'chairs', type: 'item', name: 'Bean bag', price: 8, holds: 'table' },
  { id: 'racer-chair', category: 'chairs', type: 'item', name: 'Racer reading chair', price: 16 },

  { id: 'lantern', category: 'lamps', type: 'item', name: 'Lantern', price: 1, small: true },
  { id: 'lamp', category: 'lamps', type: 'item', name: 'Floor lamp', price: 2 },
  { id: 'candelabra', category: 'lamps', type: 'item', name: 'Candelabra', price: 2 },
  { id: 'sconce', category: 'lamps', type: 'item', name: 'Wall sconce', price: 2, wall: true },
  { id: 'chandelier', category: 'lamps', type: 'item', name: 'Candle chandelier', price: 8 },
  { id: 'fireplace', category: 'lamps', type: 'item', name: 'Brick fireplace', price: 12 },
  { id: 'pumpkin-lantern', category: 'lamps', type: 'item', name: 'Pumpkin lantern', price: 2, small: true },
  { id: 'wood-stove', category: 'lamps', type: 'item', name: 'Wood stove', price: 8 },
  { id: 'fairy-lights', category: 'lamps', type: 'item', name: 'Fairy lights', price: 3, wall: true },
  { id: 'paper-lantern', category: 'lamps', type: 'item', name: 'Paper lantern', price: 2 },
  { id: 'mushroom-lamp', category: 'lamps', type: 'item', name: 'Mushroom lamp', price: 3 },
  { id: 'firefly-jar', category: 'lamps', type: 'item', name: 'Firefly jar', price: 2, small: true },
  { id: 'orb-lamp', category: 'lamps', type: 'item', name: 'Floating orb lamp', price: 4 },
  { id: 'crystal-cluster', category: 'lamps', type: 'item', name: 'Glowing crystals', price: 3, small: true },
  { id: 'pink-desk-lamp', category: 'lamps', type: 'item', name: 'Pink desk lamp', price: 12, small: true },
  { id: 'flower-lamp', category: 'lamps', type: 'item', name: 'Buttercup lamp', price: 14, small: true },
  { id: 'bear-light', category: 'lamps', type: 'item', name: 'Bear night light', price: 10, small: true },
  { id: 'wood-mushroom', category: 'lamps', type: 'item', name: 'Wooden mushroom light', price: 9, small: true },
  { id: 'brass-lantern', category: 'lamps', type: 'item', name: 'Brass wall lantern', price: 10, wall: true },
  { id: 'iron-candelabra', category: 'lamps', type: 'item', name: 'Iron candelabra', price: 12 },
  { id: 'lava-lamp', category: 'lamps', type: 'item', name: 'Lava lamp', price: 8, small: true },
  { id: 'cube-lantern', category: 'lamps', type: 'item', name: 'Glowing cube lantern', price: 6, small: true },
  { id: 'star-garland', category: 'lamps', type: 'item', name: 'Star & moon garland', price: 10, wall: true },
  { id: 'globe-pendant', category: 'lamps', type: 'item', name: 'Globe pendant', price: 8 },

  { id: 'rug', category: 'rugs', type: 'item', name: 'Persian rug', price: 2 },
  { id: 'round-rug', category: 'rugs', type: 'item', name: 'Round rug', price: 2 },
  { id: 'runner-rug', category: 'rugs', type: 'item', name: 'Runner rug', price: 2 },
  { id: 'leaf-rug', category: 'rugs', type: 'item', name: 'Maple-leaf rug', price: 2 },
  { id: 'cloud-rug', category: 'rugs', type: 'item', name: 'Fluffy cloud rug', price: 2 },
  { id: 'moss-rug', category: 'rugs', type: 'item', name: 'Moss rug', price: 2 },
  { id: 'moon-rug', category: 'rugs', type: 'item', name: 'Violet round rug', price: 2 },
  { id: 'arcane-rug', category: 'rugs', type: 'item', name: 'Arcane circle rug', price: 10 },
  { id: 'checker-rug', category: 'rugs', type: 'item', name: 'Scalloped checker rug', price: 8 },
  { id: 'wave-rug', category: 'rugs', type: 'item', name: 'Wavy blue rug', price: 8 },
  { id: 'star-rug', category: 'rugs', type: 'item', name: 'Starry night rug', price: 9 },
  { id: 'puddle-rug', category: 'rugs', type: 'item', name: 'Fluffy puddle rug', price: 8 },
  { id: 'pool-rug', category: 'rugs', type: 'item', name: 'Sand & pool rug', price: 9 },

  { id: 'plant', category: 'plants', type: 'item', name: 'Potted plant', price: 2 },
  { id: 'monstera', category: 'plants', type: 'item', name: 'Monstera', price: 3 },
  { id: 'indoor-tree', category: 'plants', type: 'item', name: 'Indoor tree', price: 9 },
  { id: 'pebble-planter', category: 'plants', type: 'item', name: 'Pebble planter', price: 3 },
  { id: 'hanging-plant', category: 'plants', type: 'item', name: 'Hanging plant', price: 2 },
  { id: 'maple-tree', category: 'plants', type: 'item', name: 'Potted maple', price: 5 },
  { id: 'tulip-vase', category: 'plants', type: 'item', name: 'Tulips', price: 1, small: true },
  { id: 'glossy-tulip', category: 'plants', type: 'item', name: 'Glossy tulip vase', price: 9, small: true },
  { id: 'white-tulips', category: 'plants', type: 'item', name: 'White tulips in glass', price: 10, small: true },
  { id: 'sunflower-pot', category: 'plants', type: 'item', name: 'Sunflower pot', price: 8, small: true },
  { id: 'succulent-pot', category: 'plants', type: 'item', name: 'Succulent pot', price: 8, small: true },
  { id: 'leafy-pot', category: 'plants', type: 'item', name: 'Leafy cream pot', price: 8, small: true },

  { id: 'vase', category: 'decor', type: 'item', name: 'Flower vase', price: 1, small: true },
  { id: 'globe', category: 'decor', type: 'item', name: 'Globe', price: 3 },
  { id: 'clock', category: 'decor', type: 'item', name: 'Grandfather clock', price: 5 },
  { id: 'book-stack', category: 'decor', type: 'item', name: 'Stack of books', price: 1, small: true },
  { id: 'cat-bed', category: 'decor', type: 'item', name: 'Sleeping cat', price: 4 },
  { id: 'library-ladder', category: 'decor', type: 'item', name: 'Library ladder', price: 3 },
  { id: 'picture-frames', category: 'decor', type: 'item', name: 'Picture frames', price: 2, wall: true },
  { id: 'pumpkins', category: 'decor', type: 'item', name: 'Pumpkin patch', price: 2 },
  { id: 'apple-crate', category: 'decor', type: 'item', name: 'Crate of apples', price: 2 },
  { id: 'wall-shelf', category: 'decor', type: 'item', name: 'Little wall shelf', price: 2, wall: true },
  { id: 'birdcage', category: 'decor', type: 'item', name: 'Brass birdcage', price: 2 },
  { id: 'telescope', category: 'decor', type: 'item', name: 'Telescope', price: 5 },
  { id: 'floating-books', category: 'decor', type: 'item', name: 'Floating spellbooks', price: 8 },
  { id: 'game-buddy', category: 'decor', type: 'item', name: 'Game buddy', price: 20, small: true },
  { id: 'retro-computer', category: 'decor', type: 'item', name: 'Mini retro computer', price: 18, small: true },
  { id: 'keyboard', category: 'decor', type: 'item', name: 'Mint keyboard', price: 12, small: true },
  { id: 'headphones', category: 'decor', type: 'item', name: 'Headphones on a stand', price: 14, small: true },
  { id: 'microphone', category: 'decor', type: 'item', name: 'Studio microphone', price: 12, small: true },
  { id: 'matcha', category: 'decor', type: 'item', name: 'Iced matcha', price: 8, small: true },
  { id: 'pencil-case', category: 'decor', type: 'item', name: 'Pencil case', price: 8, small: true },
  { id: 'desk-calendar', category: 'decor', type: 'item', name: 'Desk calendar', price: 8, small: true },
  { id: 'crystal-broom', category: 'decor', type: 'item', name: 'Crystal broom', price: 12 },
  { id: 'wizard-hat', category: 'decor', type: 'item', name: "Wizard's hat", price: 8, small: true },
  { id: 'spellbook', category: 'decor', type: 'item', name: 'Open spellbook', price: 9, small: true },
  { id: 'potion-bottle', category: 'decor', type: 'item', name: 'Potion bottle', price: 6, small: true },
  { id: 'floating-crystal', category: 'decor', type: 'item', name: 'Floating crystal', price: 10, small: true },
  { id: 'armillary', category: 'decor', type: 'item', name: 'Armillary sphere', price: 10, small: true },
  { id: 'quill-ink', category: 'decor', type: 'item', name: 'Quill & ink', price: 6, small: true },
  { id: 'trinket-box', category: 'decor', type: 'item', name: 'Crystal cat box', price: 12, small: true },
  { id: 'moon-mirror', category: 'decor', type: 'item', name: 'Moon mirror', price: 12, wall: true },
  { id: 'spell-chart', category: 'decor', type: 'item', name: 'Framed spell chart', price: 9, wall: true },
  { id: 'moon-chalkboard', category: 'decor', type: 'item', name: 'Moon-chart chalkboard', price: 16 },
  { id: 'standing-mirror', category: 'decor', type: 'item', name: 'Gothic standing mirror', price: 18 },
  { id: 'velvet-chest', category: 'decor', type: 'item', name: 'Locked velvet chest', price: 14 },
  { id: 'iron-cauldron', category: 'decor', type: 'item', name: 'Iron cauldron', price: 14 },
  { id: 'book-cart', category: 'decor', type: 'item', name: 'Library book cart', price: 12 },
  { id: 'book-tower', category: 'decor', type: 'item', name: 'Book tower', price: 12 },
  { id: 'record-player', category: 'decor', type: 'item', name: 'Record player', price: 10, small: true },
  { id: 'dino-plush', category: 'decor', type: 'item', name: 'Dino reading buddy', price: 8, small: true },
  { id: 'notice-board', category: 'decor', type: 'item', name: 'Library notice board', price: 8, wall: true },
  { id: 'library-sign', category: 'decor', type: 'item', name: 'Hanging library sign', price: 10, wall: true },
  { id: 'wavy-mirror', category: 'decor', type: 'item', name: 'Wavy mint mirror', price: 12 },
  { id: 'world-map', category: 'decor', type: 'item', name: 'World map', price: 9, wall: true },

  { id: 'stairs-straight', category: 'stairs', type: 'item', name: 'Oak staircase', price: 15, stairwell: [0.5, 1.46] },
  { id: 'stairs-spiral', category: 'stairs', type: 'item', name: 'Spiral staircase', price: 20, stairwell: [0.86, 0.86] },
  { id: 'stairs-cottage', category: 'stairs', type: 'item', name: 'Cottage railed staircase', price: 18, stairwell: [0.56, 1.46] },
  { id: 'stairs-floating', category: 'stairs', type: 'item', name: 'Floating modern stairs', price: 22, stairwell: [0.52, 1.46] },
  { id: 'stairs-bookcase', category: 'stairs', type: 'item', name: 'Bookcase staircase', price: 26, stairwell: [0.6, 1.46] },
  { id: 'stairs-stone', category: 'stairs', type: 'item', name: 'Castle stone stairs', price: 20, stairwell: [0.56, 1.46] },
  { id: 'stairs-curved', category: 'stairs', type: 'item', name: 'Curved oak staircase', price: 24, stairwell: [1.12, 1.12] },
]

// How Ember is earned. Every one-off reward is recorded once in the ledger
// with what it was for, so it cannot be earned twice.
export const EMBER_RULES = {
  welcome: 10, // once, to every new reader
  dailyCheckIn: 3, // once per day, claimed by the reader
  bookFinished: 15, // once per book, the first time it is marked Read
  pagesPerEmber: 50, // 1 Ember for every 50 pages reached in a book, once
  dailyPageGoal: 20, // pages to read in one day...
  dailyGoalReward: 5, // ...for this, once per day
}

// A reader can own this many things in all, placed or in storage. As many as
// they like can stand in the room at once.
export const MAX_OWNED_ITEMS = 200

export const ITEM_KINDS = CATALOG.filter((entry) => entry.type === 'item').map((entry) => entry.id)
// What the shop sells: everything but the pieces built into every room.
export const forSale = (entry) => Boolean(entry) && !entry.builtIn
export const catalogEntry = (id) => CATALOG.find((entry) => entry.id === id)
export const FREE_FINISHES = CATALOG.filter((e) => e.type !== 'item' && e.price === 0).map((e) => e.id)

// The room settings a finish can be chosen for, each named after its type.
export const FINISH_TYPES = ['wallpaper', 'floor', 'wallShape', 'roof', 'loft']
// What a room has before the reader changes anything.
export const ROOM_DEFAULTS = {
  wallpaper: 'wallpaper-plain',
  floor: 'floor-planks',
  upperFloor: 'floor-planks',
  wallShape: 'shape-straight',
  roof: 'roof-open',
  loft: 'loft-none',
}

// What a sold item brings back: half what it cost, rounded down.
export const sellPrice = (kind) => Math.floor((catalogEntry(kind)?.price ?? 0) / 2)

// ---------------------------------------------------------------- room blocks
//
// The room is built of blocks, one at a time, each put where the reader
// chooses. A floor block is a square tile `floor` metres a side, on a grid:
// block (i, j) covers x from -2.5 + 5i to 2.5 + 5i, and z the same with j.
// A wall block is `floor` metres long and `wall` metres high, standing on an
// edge of the grid and stacked on whatever wall already stands there:
//
//   an "x" wall runs along x, at the low-z edge of square (i, j)
//   a  "z" wall runs along z, at the low-x edge of square (i, j)
//
// Every room starts with one floor block and a wall block along two of its
// sides. A block is paid for when the reader puts it down, and can be moved,
// or taken away for half its price back.
//
// With a staircase in the room and a wall at least two blocks high, an
// upstairs floor can be laid over a floor square, one block at a time,
// leaving an opening where the stairs come up.
//
// `room.blocks` is the list, each { kind: 'floor' | 'wall' | 'upper', side:
// '' | 'x' | 'z', i, j, level } (level counts up from 0 for walls, and is 0
// for floor and upstairs floor).
export const BLOCKS = {
  floor: 5,
  wall: 3,
  floorPrice: 25,
  wallPrice: 12,
  upperPrice: 30,
  upperWalls: 2, // how many wall blocks high the first upstairs floor needs
  thickness: 0.18, // of a wall
  maxFloor: 12, // floor blocks in all
  maxLevels: 3, // wall blocks stacked on one edge
  reach: 2, // floor squares go no further than this from the first
}
export const BLOCK_KINDS = ['floor', 'wall', 'upper']
export const DEFAULT_BLOCKS = [
  { kind: 'floor', side: '', i: 0, j: 0, level: 0 },
  { kind: 'wall', side: 'x', i: 0, j: 0, level: 0 },
  { kind: 'wall', side: 'z', i: 0, j: 0, level: 0 },
]

const CORNER = -2.5
const CLEARANCE = 0.3 // how far furniture stands from the edge of the floor
const round2 = (n) => Math.round(n * 100) / 100

const blocksOf = (room) => room?.blocks ?? DEFAULT_BLOCKS
export const floorCells = (room) => blocksOf(room).filter((b) => b.kind === 'floor')
const hasCell = (cells, i, j) => cells.some((c) => c.i === i && c.j === j)
export const blockCount = (room, kind) => blocksOf(room).filter((b) => b.kind === kind).length
export const blockPrice = (kind) => (kind === 'floor' ? BLOCKS.floorPrice : kind === 'upper' ? BLOCKS.upperPrice : BLOCKS.wallPrice)
export const upperCells = (room) => blocksOf(room).filter((b) => b.kind === 'upper')

// The square a floor block covers, in metres.
export function cellBox(i, j) {
  const x = CORNER + i * BLOCKS.floor
  const z = CORNER + j * BLOCKS.floor
  return { x: [x, x + BLOCKS.floor], z: [z, z + BLOCKS.floor] }
}

// Whether there is floor on either side of an edge: `before` on its low side
// (low z for an "x" wall, low x for a "z" wall), `after` on its high side.
export function edgeSides(room, side, i, j) {
  const cells = floorCells(room)
  return side === 'x'
    ? { before: hasCell(cells, i, j - 1), after: hasCell(cells, i, j) }
    : { before: hasCell(cells, i - 1, j), after: hasCell(cells, i, j) }
}

// How many wall blocks stand on an edge.
export const wallHeight = (room, side, i, j) =>
  blocksOf(room).filter((b) => b.kind === 'wall' && b.side === side && b.i === i && b.j === j).length

// Every edge with a wall on it: [{ side, i, j, height }], height in blocks.
export function walls(room) {
  const byEdge = new Map()
  for (const b of blocksOf(room)) {
    if (b.kind !== 'wall') continue
    const key = `${b.side}${b.i},${b.j}`
    byEdge.set(key, { side: b.side, i: b.i, j: b.j, height: (byEdge.get(key)?.height ?? 0) + 1 })
  }
  return [...byEdge.values()]
}

// A back edge is one the room is seen across: floor on its high side and none
// on its low side, so a wall there stands at the back of the room, and never
// between the reader and the room.
export function backEdge(room, side, i, j) {
  const { before, after } = edgeSides(room, side, i, j)
  return after && !before
}

// Where the next floor block may go: beside one already laid, not too far
// from the first, and never through a wall, so nothing is laid behind one.
export function floorSpots(room) {
  const cells = floorCells(room)
  const spots = []
  for (const c of cells) {
    for (const [di, dj, side, ei, ej] of [
      [1, 0, 'z', c.i + 1, c.j],
      [-1, 0, 'z', c.i, c.j],
      [0, 1, 'x', c.i, c.j + 1],
      [0, -1, 'x', c.i, c.j],
    ]) {
      const i = c.i + di
      const j = c.j + dj
      if (Math.abs(i) > BLOCKS.reach || Math.abs(j) > BLOCKS.reach) continue
      if (hasCell(cells, i, j) || spots.some((s) => s.i === i && s.j === j)) continue
      if (wallHeight(room, side, ei, ej) > 0) continue
      spots.push({ i, j })
    }
  }
  return spots
}

// Where the next wall block may go: on a back edge of the floor (so a wall
// never closes the room off from the reader looking in), or on top of the
// wall already standing there, up to maxLevels high. Each spot is
// { side, i, j, level }, level being where the new block would sit.
export function wallSpots(room) {
  const spots = []
  const seen = new Set()
  for (const c of floorCells(room)) {
    // A square's low-z and low-x edges are the only ones that can be at the
    // back of it.
    for (const [side, i, j] of [['x', c.i, c.j], ['z', c.i, c.j]]) {
      const key = `${side}${i},${j}`
      if (seen.has(key) || !backEdge(room, side, i, j)) continue
      seen.add(key)
      const level = wallHeight(room, side, i, j)
      if (level < BLOCKS.maxLevels) spots.push({ side, i, j, level })
    }
  }
  return spots
}

// Where the next upstairs floor block may go: over a floor square with none
// yet, once a staircase stands in the room; the first over a square with a
// wall at least BLOCKS.upperWalls high at its back, the rest beside one
// already laid. `items` are the room's furniture, for the staircase.
export function upperSpots(room, items = room?.items ?? []) {
  const stairs = items.some((item) => item.placed && (item.level ?? 0) === 0 && catalogEntry(item.kind)?.stairwell)
  if (!stairs) return []
  const uppers = upperCells(room)
  const tall = (side, i, j) => wallHeight(room, side, i, j) >= BLOCKS.upperWalls
  return floorCells(room)
    .filter(({ i, j }) => !hasCell(uppers, i, j))
    .filter(({ i, j }) => tall('x', i, j) || tall('z', i, j) || uppers.some((u) => Math.abs(u.i - i) + Math.abs(u.j - j) === 1))
    .map(({ i, j }) => ({ i, j }))
}

// Whether a block may be put there; for a wall, the level it would sit at.
export function canPlace(room, kind, { side, i, j }, items) {
  if (kind === 'floor') return floorSpots(room).some((s) => s.i === i && s.j === j)
  if (kind === 'upper') return upperSpots(room, items).some((s) => s.i === i && s.j === j)
  return wallSpots(room).some((s) => s.side === side && s.i === i && s.j === j)
}

// What the reader's blocks are worth, beyond the three every room starts with.
export function blocksValue(room) {
  const floor = Math.max(0, blockCount(room, 'floor') - 1)
  const wall = Math.max(0, blockCount(room, 'wall') - 2)
  return floor * BLOCKS.floorPrice + wall * BLOCKS.wallPrice + blockCount(room, 'upper') * BLOCKS.upperPrice
}

// How far the floor reaches, in metres, and how tall the tallest wall is.
export function roomExtent(room) {
  const boxes = floorCells(room).map((c) => cellBox(c.i, c.j))
  return {
    x: [Math.min(...boxes.map((b) => b.x[0])), Math.max(...boxes.map((b) => b.x[1]))],
    z: [Math.min(...boxes.map((b) => b.z[0])), Math.max(...boxes.map((b) => b.z[1]))],
    height: Math.max(BLOCKS.wall, ...walls(room).map((w) => w.height * BLOCKS.wall)),
  }
}

// ---------------------------------------------------------------- the loft
//
// The loft is a gallery `y` metres up along the first window wall (the "z"
// walls at x = -2.5), out to x = `edge`. Once bought, it runs over every
// floor square of that first column where the wall stands at least
// `wallBlocks` blocks high.
export const LOFT = { y: 3, edge: -1.1, wallBlocks: 2 }

export function loftCells(room) {
  if (room?.loft !== 'loft-gallery') return []
  return floorCells(room).filter((c) => c.i === 0 && wallHeight(room, 'z', 0, c.j) >= LOFT.wallBlocks)
}
export const hasLoft = (room) => loftCells(room).length > 0
// Whether there is anywhere up there at all: the loft or an upstairs floor.
export const hasUpstairs = (room) => hasLoft(room) || upperCells(room).length > 0

// The openings an upstairs floor leaves over each staircase: { x, z } ranges.
export function stairwells(room) {
  return (room?.items ?? [])
    .filter((item) => item.placed && (item.level ?? 0) === 0 && catalogEntry(item.kind)?.stairwell)
    .map((item) => {
      const [across, along] = catalogEntry(item.kind).stairwell
      const turn = (item.rotation * Math.PI) / 180
      const hx = Math.abs(across * Math.cos(turn)) + Math.abs(along * Math.sin(turn))
      const hz = Math.abs(across * Math.sin(turn)) + Math.abs(along * Math.cos(turn))
      return { id: item.id, x: [item.x - hx, item.x + hx].map(round2), z: [item.z - hz, item.z + hz].map(round2) }
    })
}

// A rectangle with another cut out of it, as the rectangles left around it.
export function cutOut(r, hole) {
  if (hole.x[0] >= r.x[1] || hole.x[1] <= r.x[0] || hole.z[0] >= r.z[1] || hole.z[1] <= r.z[0]) return [r]
  const x = [Math.max(r.x[0], hole.x[0]), Math.min(r.x[1], hole.x[1])]
  return [
    { x: [r.x[0], hole.x[0]], z: r.z },
    { x: [hole.x[1], r.x[1]], z: r.z },
    { x, z: [r.z[0], hole.z[0]] },
    { x, z: [hole.z[1], r.z[1]] },
  ].filter((piece) => piece.x[1] - piece.x[0] > 0.05 && piece.z[1] - piece.z[0] > 0.05)
}

// ---------------------------------------------------------------- standing room
//
// Where furniture may stand: rectangles of floor, each a floor block kept
// CLEARANCE from any edge with no floor beyond it. On the loft (level 1), the
// gallery the same way.
export function standingAreas(room, level = 0, clearance = CLEARANCE) {
  const cells = level === 1 ? loftCells(room) : floorCells(room)
  const areas = cells.map(({ i, j }) => {
    const box = cellBox(i, j)
    const inset = (di, dj) => (hasCell(cells, i + di, j + dj) ? 0 : clearance)
    const x = level === 1 ? [CORNER + clearance, LOFT.edge - 0.2] : [box.x[0] + inset(-1, 0), box.x[1] - inset(1, 0)]
    return { x: x.map(round2), z: [box.z[0] + inset(0, -1), box.z[1] - inset(0, 1)].map(round2) }
  })
  if (level !== 1) return areas
  // Upstairs floor blocks too, kept clear of the opening over each staircase.
  const uppers = upperCells(room)
  const holes = stairwells(room).map((h) => ({ x: [h.x[0] - clearance, h.x[1] + clearance], z: [h.z[0] - clearance, h.z[1] + clearance] }))
  for (const { i, j } of uppers) {
    const box = cellBox(i, j)
    const inset = (di, dj) => (hasCell(uppers, i + di, j + dj) ? 0 : clearance)
    let pieces = [{ x: [box.x[0] + inset(-1, 0), box.x[1] - inset(1, 0)], z: [box.z[0] + inset(0, -1), box.z[1] - inset(0, 1)] }]
    for (const hole of holes) pieces = pieces.flatMap((piece) => cutOut(piece, hole))
    areas.push(...pieces.map((piece) => ({ x: piece.x.map(round2), z: piece.z.map(round2) })))
  }
  return areas
}

const inside = (v, [min, max]) => v >= min - 1e-6 && v <= max + 1e-6

export function itemFits(room, level, x, z, clearance = CLEARANCE) {
  return standingAreas(room, level, clearance).some((a) => inside(x, a.x) && inside(z, a.z))
}

// The nearest place an item may stand to (x, z), or null if there is none on
// that level.
export function nearestSpot(room, level, x, z, clearance = CLEARANCE) {
  let best = null
  for (const a of standingAreas(room, level, clearance)) {
    const spot = { x: round2(Math.min(a.x[1], Math.max(a.x[0], x))), z: round2(Math.min(a.z[1], Math.max(a.z[0], z))) }
    const distance = Math.hypot(spot.x - x, spot.z - z)
    if (!best || distance < best.distance) best = { ...spot, distance }
  }
  return best && { x: best.x, z: best.z }
}

// A window's height on its wall (y, at its middle) and its size, as a scale.
// The room keeps it on its wall; these are the outer limits.
export const WINDOW_LIMITS = { y: [0.3, BLOCKS.wall * BLOCKS.maxLevels], size: [0.5, 2] }

// ---------------------------------------------------------------- the built-in pieces
//
// Every room starts with a bookcase built into it, which the reader's books
// fill first, and a little shelf of old volumes. They are room items like any
// other: moved, turned, stored or sold. Being built against the wall, they may
// stand closer to it than other furniture.
export const BUILT_INS = [
  { kind: 'built-in-bookcase', x: 1.05, z: -2.27, rotation: 0 },
  { kind: 'built-in-shelf', x: -2.31, z: -1.8, rotation: 90 },
]
export const clearanceOf = (kind) => (catalogEntry(kind)?.builtIn ? 0.1 : CLEARANCE)

// ---------------------------------------------------------------- sizes and colours
//
// A bookcase or a window can be made wider or taller (sx, sy: scales of its
// usual size), and anything can be painted a colour of the reader's choosing.
export const SIZE_LIMITS = { sx: [0.6, 1.6], sy: [0.6, 1.6] }
export const resizable = (kind) => {
  const entry = catalogEntry(kind)
  return entry?.holds === 'shelves' || entry?.category === 'windows'
}
export const isSmall = (kind) => Boolean(catalogEntry(kind)?.small)

// ---------------------------------------------------------------- walls' faces
//
// Something hung on a wall (catalogue entries with `wall: true`) hangs on the
// room-side face of a wall: the side with floor beside it. With floor on both
// sides a wall stands centred on its edge; otherwise just outside the floor.
const THICKNESS = BLOCKS.thickness

export function wallFace(room, { side, i, j }) {
  const { before, after } = edgeSides(room, side, i, j)
  const facing = after ? 1 : -1
  const behind = before && after ? THICKNESS / 2 : THICKNESS
  const edge = CORNER + (side === 'x' ? j : i) * BLOCKS.floor
  const start = CORNER + (side === 'x' ? i : j) * BLOCKS.floor
  return {
    side,
    i,
    j,
    facing,
    behind,
    edge,
    start,
    // where the face is, across the edge, and the way it looks
    face: facing > 0 ? edge - behind + THICKNESS : edge + behind - THICKNESS,
    normal: side === 'x' ? [0, facing] : [facing, 0],
    // the rotation, in degrees, of something hung on it
    turn: side === 'x' ? (facing > 0 ? 0 : 180) : facing > 0 ? 90 : 270,
    along: [start, start + BLOCKS.floor],
  }
}

// Which wall something hung on a wall is on, from where it is and the way it
// faces.
export function wallOf(item) {
  const block = (v) => (v - CORNER) / BLOCKS.floor
  return item.rotation === 90 || item.rotation === 270
    ? { side: 'z', i: Math.round(block(item.x)), j: Math.floor(block(item.z)) }
    : { side: 'x', i: Math.floor(block(item.x)), j: Math.round(block(item.z)) }
}

// How far along its wall it is: x on an "x" wall, z on a "z" wall.
export const alongOf = (item) => (item.rotation === 90 || item.rotation === 270 ? item.z : item.x)

// Hung on a wall, `along` it and facing the room, kept `margin` from the
// wall's ends, its back against the wall's face: { x, z, rotation }.
export function onWallAt(room, edge, along, margin = 0.3) {
  const face = wallFace(room, edge)
  const low = face.along[0] + margin
  const high = face.along[1] - margin
  const at = round2(low > high ? (low + high) / 2 : Math.min(high, Math.max(low, along)))
  const off = round2(face.face + 0.3 * (face.normal[0] + face.normal[1]))
  return edge.side === 'x' ? { x: at, z: off, rotation: face.turn } : { x: off, z: at, rotation: face.turn }
}

const hangsOnWall = (kind) => Boolean(catalogEntry(kind)?.wall)
const sameEdge = (a, b) => a.side === b.side && a.i === b.i && a.j === b.j

// ---------------------------------------------------------------- changing the blocks
//
// Adding, moving and taking away blocks, the same in the browser's demo and
// on the server. A change must leave the floor in one piece, at least one
// floor block, and no wall standing with no floor beside it.

// Whether the floor squares all join up.
function joinedUp(cells) {
  if (cells.length === 0) return false
  const seen = new Set([`${cells[0].i},${cells[0].j}`])
  const queue = [cells[0]]
  while (queue.length) {
    const { i, j } = queue.shift()
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${i + di},${j + dj}`
      if (!seen.has(key) && hasCell(cells, i + di, j + dj)) {
        seen.add(key)
        queue.push({ i: i + di, j: j + dj })
      }
    }
  }
  return seen.size === cells.length
}

// Why these blocks would not make a room, or null if they do.
function unsound(blocks) {
  const room = { blocks }
  const cells = floorCells(room)
  if (cells.length === 0) return 'last'
  if (!joinedUp(cells)) return 'apart'
  const stranded = walls(room).some((w) => {
    const { before, after } = edgeSides(room, w.side, w.i, w.j)
    return !before && !after
  })
  if (stranded) return 'walls'
  return upperCells(room).some((u) => !hasCell(cells, u.i, u.j)) ? 'upper' : null
}

const isFloorAt = (b, { i, j }) => b.kind === 'floor' && b.i === i && b.j === j
const isUpperAt = (b, { i, j }) => b.kind === 'upper' && b.i === i && b.j === j
const isWallAt = (b, edge) => b.kind === 'wall' && sameEdge(b, edge)

// What a floor block or wall block taken away gives back: half its price,
// like furniture.
export const blockRefund = (kind) => Math.floor(blockPrice(kind) / 2)

// Apply one change to the room's blocks:
//   { type: 'add', kind, at }          a new block, at { i, j } or a wall edge
//   { type: 'move', kind, from, to }   a floor block, or a whole wall, moved
//   { type: 'remove', kind, at }       a floor block, or a wall's top block
// `items` are the room's furniture. Returns { blocks, items }: the new blocks,
// and the furniture that has to move as a result (as patches, each with its
// id: furniture on a moved floor block goes with it, things hung on a moved
// wall go with the wall, anything left off the floor comes to the nearest
// spot, and a window with no wall goes into storage). Or { error } saying why
// not: 'spot', 'none', 'last', 'apart', 'walls' or 'upper'. An upstairs floor
// block is put down or taken away, never moved.
export function changeBlocks(room, items, change) {
  const { type, kind } = change
  let blocks = blocksOf(room)
  const moved = new Map() // id -> fields changed by the move itself

  if (type === 'add') {
    if (!canPlace(room, kind, change.at, items)) return { error: 'spot' }
    const level = kind === 'wall' ? wallHeight(room, change.at.side, change.at.i, change.at.j) : 0
    blocks = [...blocks, { kind, side: kind === 'wall' ? change.at.side : '', i: change.at.i, j: change.at.j, level }]
  } else if (type === 'remove') {
    if (kind === 'upper') {
      if (!blocks.some((b) => isUpperAt(b, change.at))) return { error: 'none' }
      blocks = blocks.filter((b) => !isUpperAt(b, change.at))
    } else if (kind === 'floor') {
      if (!blocks.some((b) => isFloorAt(b, change.at))) return { error: 'none' }
      blocks = blocks.filter((b) => !isFloorAt(b, change.at))
    } else {
      const height = wallHeight(room, change.at.side, change.at.i, change.at.j)
      if (height === 0) return { error: 'none' }
      blocks = blocks.filter((b) => !(isWallAt(b, change.at) && b.level === height - 1))
    }
  } else if (type === 'move') {
    const { from, to } = change
    if (kind === 'upper') return { error: 'spot' }
    if (kind === 'floor') {
      if (!blocks.some((b) => isFloorAt(b, from))) return { error: 'none' }
      const without = blocks.filter((b) => !isFloorAt(b, from))
      if ((from.i === to.i && from.j === to.j) || !canPlace({ blocks: without }, 'floor', to)) return { error: 'spot' }
      blocks = [...without, { kind: 'floor', side: '', i: to.i, j: to.j, level: 0 }]
      // Whatever stands on it goes with it.
      const box = cellBox(from.i, from.j)
      const dx = (to.i - from.i) * BLOCKS.floor
      const dz = (to.j - from.j) * BLOCKS.floor
      const onIt = (x, z) => x >= box.x[0] && x <= box.x[1] && z >= box.z[0] && z <= box.z[1]
      for (const item of items) {
        if (!item.placed || hangsOnWall(item.kind) || !onIt(item.x, item.z)) continue
        moved.set(item.id, { x: round2(item.x + dx), z: round2(item.z + dz) })
      }
    } else {
      const height = wallHeight(room, from.side, from.i, from.j)
      if (height === 0) return { error: 'none' }
      if (sameEdge(from, to) || wallHeight(room, to.side, to.i, to.j) > 0) return { error: 'spot' }
      if (!backEdge(room, to.side, to.i, to.j)) return { error: 'spot' }
      blocks = blocks.map((b) => (isWallAt(b, from) ? { ...b, side: to.side, i: to.i, j: to.j } : b))
      // Windows and the like go with their wall, as far along and as high.
      const start = wallFace(room, from).along[0]
      const target = wallFace({ blocks }, to).along[0]
      for (const item of items) {
        if (!item.placed || !hangsOnWall(item.kind) || !sameEdge(wallOf(item), from)) continue
        moved.set(item.id, onWallAt({ blocks }, to, target + (alongOf(item) - start), 0.1))
      }
    }
  }

  const problem = unsound(blocks)
  if (problem) return { error: problem }

  // Settle everything into the new room.
  const after = { ...room, blocks, items }
  const patches = []
  for (const item of items) {
    if (!item.placed) continue
    const now = { ...item, ...moved.get(item.id) }
    const patch = { ...moved.get(item.id) }
    if (hangsOnWall(item.kind)) {
      const edge = wallOf(now)
      const top = wallHeight(after, edge.side, edge.i, edge.j) * BLOCKS.wall
      if (top === 0 || (item.y ?? 0) > top - 0.3) patch.placed = false
      else Object.assign(patch, onWallAt(after, edge, alongOf(now), 0.1))
    } else if (!item.on) {
      // Something standing on something else goes wherever that goes.
      let level = now.level ?? 0
      const clearance = clearanceOf(item.kind)
      if (level === 1 && !hasUpstairs(after)) patch.level = level = 0
      if (!itemFits(after, level, now.x, now.z, clearance)) Object.assign(patch, nearestSpot(after, level, now.x, now.z, clearance))
    }
    const changed = Object.fromEntries(Object.entries(patch).filter(([key, value]) => item[key] !== value))
    if (Object.keys(changed).length > 0) patches.push({ id: item.id, ...changed })
  }
  return { blocks, items: patches }
}

// Where a block may go in a change, for the room to show while the reader
// chooses: every spot `changeBlocks` would accept.
export function moveSpots(room, kind, from) {
  if (kind === 'upper') return []
  const candidates = kind === 'floor'
    ? floorSpots({ blocks: blocksOf(room).filter((b) => !isFloorAt(b, from)) })
    : wallSpots(room).filter((s) => s.level === 0).map(({ side, i, j }) => ({ side, i, j }))
  return candidates.filter((to) => !changeBlocks(room, [], { type: 'move', kind, from, to }).error)
}

// The blocks that may be picked up to move, or taken away.
export function pickSpots(room, kind, type) {
  if (kind === 'upper' && type === 'move') return []
  const options = kind === 'upper'
    ? upperCells(room).map(({ i, j }) => ({ i, j }))
    : kind === 'floor'
    ? floorCells(room).map(({ i, j }) => ({ i, j }))
    : walls(room).map(({ side, i, j, height }) => ({ side, i, j, level: type === 'remove' ? height - 1 : 0, levels: type === 'remove' ? 1 : height }))
  if (type === 'remove') return options.filter((at) => !changeBlocks(room, room?.items ?? [], { type, kind, at }).error)
  return options.filter((from) => moveSpots(room, kind, from).length > 0)
}
