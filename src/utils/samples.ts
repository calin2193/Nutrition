import type { MealCategory } from '../types/nutrition';

export interface SamplePhotoPreset {
  id: string;
  label: string;
  subtitle: string;
  imageUrl: string;
  hint: string;
  category: MealCategory;
}

export const SAMPLE_PHOTO_PRESETS: SamplePhotoPreset[] = [
  {
    id: 'sample-breakfast',
    label: 'Iaurt cu fructe și granola',
    subtitle: 'Mic dejun',
    imageUrl: '/src/assets/images/sample_breakfast_oats_1795637865181.jpg',
    hint: '200g iaurt grecesc 2%, 50g granola, afine, zmeură, jumătate de banană, semințe chia',
    category: 'mic_dejun',
  },
  {
    id: 'sample-salmon',
    label: 'Bol cu somon și avocado',
    subtitle: 'Prânz',
    imageUrl: '/src/assets/images/sample_salmon_bowl_1795637864934.jpg',
    hint: '160g somon la grătar, 150g orez brun fiert, jumătate de avocado, edamame și castraveți',
    category: 'pranz',
  },
  {
    id: 'sample-pasta',
    label: 'Penne pesto cu roșii',
    subtitle: 'Cină',
    imageUrl: '/src/assets/images/sample_pasta_pesto_1795637865453.jpg',
    hint: '220g paste penne fierte, 35g sos pesto cu busuioc, parmezan, muguri de pin și roșii cherry',
    category: 'cina',
  },
];
