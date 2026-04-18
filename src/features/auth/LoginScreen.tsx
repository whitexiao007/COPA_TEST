import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardCheck, Plus, Building2, User, ShieldCheck, ChevronRight } from 'lucide-react';
import { db, Organization, UserProfile } from '../../db/schema';
import { seedDatabase } from '../../db/seed';
import { useAppStore } from '../../stores/appStore';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEMO_ORGS: Organization[] = [
  { tenantId: 'redstone-demo', name: 'Redstone Energy (Demo)', createdAt: new Date().toISOString() },
  { tenantId: 'ironclad-demo', name: 'Ironclad Resources (Demo)', createdAt: new Date().toISOString() },
  { tenantId: 'vantage-demo', name: 'Vantage Field Operations (Demo)', createdAt: new Date().toISOString() }
];

export default function LoginScreen() {
  const navigate = useNavigate();
  const login = useAppStore(s => s.login);
  
  const organizations = useLiveQuery(() => db.organizations.toArray());
  
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgTenantId, setNewOrgTenantId] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'inspector'>('inspector');

  useEffect(() => {
    const seedDemoOrgs = async () => {
      const count = await db.organizations.count();
      if (count === 0) {
        await db.organizations.bulkAdd(DEMO_ORGS);
      }
    };
    seedDemoOrgs();
  }, []);

  const handleLogin = async () => {
    let tenantId = '';
    let orgName = '';

    if (isCreatingOrg) {
      tenantId = newOrgTenantId.toLowerCase().replace(/\s+/g, '-');
      orgName = newOrgName;
      await db.organizations.add({
        tenantId,
        name: orgName,
        createdAt: new Date().toISOString()
      });
    } else {
      const org = organizations?.find(o => o.tenantId === selectedOrgId);
      if (!org) return;
      tenantId = org.tenantId;
      orgName = org.name;
    }

    // Seed database for this tenant
    await seedDatabase(tenantId);

    const profile: UserProfile = {
      name: userName,
      role,
      tenantId,
      organizationName: orgName
    };

    login(profile);
    navigate({ to: '/' });
  };

  const isFormValid = (isCreatingOrg ? (newOrgName && newOrgTenantId) : selectedOrgId) && userName && role;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-slate-800 text-white text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <ClipboardCheck className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">COPA Field Inspection</CardTitle>
          <CardDescription className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mt-1">
            Western Basin Edition
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Organization</Label>
              {!isCreatingOrg && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold uppercase text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => setIsCreatingOrg(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New Organization
                </Button>
              )}
            </div>

            {isCreatingOrg ? (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1.5">
                  <Input 
                    placeholder="Organization Name (e.g. Apache Corp)" 
                    value={newOrgName}
                    onChange={(e) => {
                      setNewOrgName(e.target.value);
                      setNewOrgTenantId(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Input 
                    placeholder="Tenant Slug (e.g. apache-corp)" 
                    value={newOrgTenantId}
                    onChange={(e) => setNewOrgTenantId(e.target.value)}
                    className="bg-white font-mono text-xs"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-[10px] font-bold uppercase text-slate-500"
                  onClick={() => setIsCreatingOrg(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                {organizations?.map(org => (
                  <button
                    key={org.tenantId}
                    onClick={() => setSelectedOrgId(org.tenantId)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedOrgId === org.tenantId 
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedOrgId === org.tenantId ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-semibold ${selectedOrgId === org.tenantId ? 'text-blue-900' : 'text-slate-700'}`}>
                      {org.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Your Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="name" 
                  placeholder="Enter your full name" 
                  className="pl-10 bg-slate-50 border-slate-200"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Role</Label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger id="role" className="bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <SelectValue placeholder="Select your role" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector">Inspector (Field)</SelectItem>
                  <SelectItem value="supervisor">Supervisor (Manager)</SelectItem>
                  <SelectItem value="admin">Admin (Full Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full py-6 text-lg font-bold bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 group"
            disabled={!isFormValid}
            onClick={handleLogin}
          >
            Enter App
            <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
