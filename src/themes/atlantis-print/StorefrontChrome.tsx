import AtlantisHeader from './AtlantisHeader';

export default function StorefrontChrome({currentPath='/', navItems=[], storeBase='/', children}: any){return <div><AtlantisHeader currentPath={currentPath} navItems={navItems} storeBase={storeBase} />{children}</div>;}
