export interface MetPlace { id: string; name: string; category: string; floor: number; x: number; y: number; detail: string; coffee?: boolean }
// Approximate positions in the museum footprint. Service levels are listed separately;
// locations on levels outside this demo's two floor plans remain visible in search.
export const MET_PLACES: MetPlace[] = [
  { id: 'eatery', name: 'The Eatery', category: 'Dining', floor: 0, x: 655, y: 430, detail: 'Casual dining, sandwiches, salads, and family-friendly options. Located on the ground level.' },
  { id: 'balcony-lounge', name: 'The Balcony Lounge', category: 'Dining', floor: 2, x: 695, y: 565, detail: 'A lounge overlooking the Great Hall. Admission and access policies may apply.', coffee: true },
  { id: 'great-hall-cafe', name: 'Great Hall Balcony Cafe', category: 'Dining', floor: 2, x: 655, y: 600, detail: 'Coffee, light bites, and refreshments on the Great Hall balcony.', coffee: true },
  { id: 'lehman-cafe', name: 'Lehman Cafe Cart', category: 'Dining', floor: 1, x: 650, y: 310, detail: 'A refreshment cart near the Robert Lehman Wing.', coffee: true },
  { id: 'american-cafe', name: 'American Wing Cafe', category: 'Dining', floor: 1, x: 800, y: 330, detail: 'Light meals and refreshments in the American Wing courtyard.', coffee: true },
  { id: 'petrie-cafe', name: 'Petrie Court Cafe', category: 'Dining', floor: 1, x: 485, y: 330, detail: 'Dining by the Petrie European Sculpture Court.', coffee: true },
  { id: 'roof-garden', name: 'The Iris and B. Gerald Cantor Roof Garden Bar', category: 'Dining', floor: 5, x: 455, y: 385, detail: 'Seasonal rooftop refreshments. Check with museum staff for weather-related access and opening hours.' },
  { id: 'members-dining', name: 'The Met Dining Room', category: 'Dining', floor: 4, x: 400, y: 380, detail: 'Dining on the fourth floor. Reservations and access requirements may apply.' },
  { id: 'restroom-west-1', name: 'West Wing Restrooms', category: 'Restrooms', floor: 1, x: 500, y: 340, detail: 'Restrooms near Modern and Contemporary Art.' },
  { id: 'restroom-east-1', name: 'American Wing Restrooms', category: 'Restrooms', floor: 1, x: 905, y: 405, detail: 'Restrooms near the American Wing and Egyptian Art.' },
  { id: 'restroom-hall-1', name: 'Great Hall Restrooms', category: 'Restrooms', floor: 1, x: 760, y: 605, detail: 'Restrooms off the Great Hall, near visitor services.' },
  { id: 'restroom-balcony-2', name: 'Balcony Restrooms', category: 'Restrooms', floor: 2, x: 820, y: 535, detail: 'Restrooms on the east side of the Great Hall balcony.' },
  { id: 'restroom-west-2', name: 'European Paintings Restrooms', category: 'Restrooms', floor: 2, x: 510, y: 505, detail: 'Restrooms near the European Paintings galleries.' },
  { id: 'restroom-asian-2', name: 'Asian Art Restrooms', category: 'Restrooms', floor: 2, x: 940, y: 635, detail: 'Restrooms near the Asian Art galleries.' },
  { id: 'info-great-hall', name: 'Great Hall Information Desk', category: 'Information Desk', floor: 1, x: 640, y: 625, detail: 'Visitor information, museum maps, and assistance near the main entrance.' },
  { id: 'info-north', name: 'North Wing Information', category: 'Information Desk', floor: 1, x: 770, y: 395, detail: 'Visitor assistance near the American Wing.' },
  { id: 'lactation', name: 'Family and Lactation Room', category: 'Lactation Room', floor: 1, x: 560, y: 585, detail: 'A private family space near visitor services. Ask staff for access.' },
  { id: 'shop-main', name: 'The Met Store', category: 'Retail', floor: 1, x: 715, y: 605, detail: 'Books, exhibition gifts, and art-inspired objects near the Great Hall.' },
  { id: 'shop-books', name: 'Museum Bookshop', category: 'Retail', floor: 1, x: 545, y: 610, detail: 'Art books and exhibition catalogues.' },
  { id: 'shop-exhibition', name: 'Exhibition Shop', category: 'Retail', floor: 2, x: 520, y: 475, detail: 'Selected books and gifts near the exhibition galleries.' },
  { id: 'water-west-1', name: 'West Wing Water Fountain', category: 'Water Fountains', floor: 1, x: 490, y: 370, detail: 'Drinking water near the west wing restrooms.' },
  { id: 'water-east-1', name: 'East Wing Water Fountain', category: 'Water Fountains', floor: 1, x: 895, y: 430, detail: 'Drinking water near the American Wing.' },
  { id: 'water-balcony-2', name: 'Balcony Water Fountain', category: 'Water Fountains', floor: 2, x: 805, y: 540, detail: 'Drinking water near the balcony restrooms.' },
  { id: 'water-asian-2', name: 'Asian Art Water Fountain', category: 'Water Fountains', floor: 2, x: 920, y: 610, detail: 'Drinking water near the Asian Art galleries.' },
];
export const amenityKey = (label: string) => label.toLowerCase().replaceAll(' ', '-');
export const placesForAmenity = (key: string) => MET_PLACES.filter(p => key === 'coffee-shops' ? p.coffee : amenityKey(p.category) === key);
export const floorLabel = (floor: number) => floor === 0 ? 'Ground floor' : `Floor ${floor}`;
