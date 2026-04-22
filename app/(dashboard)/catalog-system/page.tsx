import { CatalogProductsBoard } from '@/components/catalog/catalog-products-board';
import { CatalogTaxonomyBoard } from '@/components/catalog/catalog-taxonomy-board';
import { CatalogMaterialsBoard } from '@/components/catalog/catalog-materials-board';
import { CatalogOptionSetsBoard } from '@/components/catalog/catalog-option-sets-board';

export default function CatalogSystemPage() {
  return (
    <div className="space-y-6">
      <CatalogProductsBoard />
      <div className="grid gap-6 xl:grid-cols-2">
        <CatalogTaxonomyBoard />
        <CatalogMaterialsBoard />
      </div>
      <CatalogOptionSetsBoard />
    </div>
  );
}
