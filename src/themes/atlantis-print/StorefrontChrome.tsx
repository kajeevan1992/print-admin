import AtlantisHeader from './AtlantisHeader';
import AtlantisFooter from './AtlantisFooter';

export default function StorefrontChrome({currentPath='/', navItems=[], storeBase='/', children}: any){return <div><AtlantisHeader currentPath={currentPath} navItems={navItems} storeBase={storeBase} />{children}<AtlantisFooter storeBase={storeBase} /></div>;}
