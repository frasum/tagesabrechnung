import { useState, useEffect, useMemo } from 'react';
import { useSkills } from '@/hooks/useSkills';
import { useDienstplanColors } from '@/hooks/useDienstplanColors';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface SkillColorSettingsProps {
  restaurantId: string;
}

export function SkillColorSettings({ restaurantId }: SkillColorSettingsProps) {
  const { data: skills = [], isLoading: loadingSkills } = useSkills();
  const { colors: absenceColors, isLoading: loadingColors, saveColors, isSaving } = useDienstplanColors();

  const [skillColors, setSkillColors] = useState<Record<string, string>>({});
  const [vacationColor, setVacationColor] = useState('#f59e0b');
  const [sickColor, setSickColor] = useState('#ef4444');
  const [saving, setSaving] = useState(false);

  // Init from DB
  useEffect(() => {
    if (skills.length > 0) {
      const map: Record<string, string> = {};
      skills.forEach(s => { map[s.id] = s.color; });
      setSkillColors(map);
    }
  }, [skills]);

  useEffect(() => {
    setVacationColor(absenceColors.vacation);
    setSickColor(absenceColors.sick);
  }, [absenceColors]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof skills> = {};
    skills.forEach(s => {
      const label = s.category === 'kitchen' ? 'Küche' : s.category === 'service' ? 'Service' : 'GL';
      if (!groups[label]) groups[label] = [];
      groups[label].push(s);
    });
    return groups;
  }, [skills]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update skill colors
      const promises = skills.map(s => {
        const newColor = skillColors[s.id];
        if (newColor && newColor !== s.color) {
          return supabase.from('skills').update({ color: newColor }).eq('id', s.id);
        }
        return null;
      }).filter(Boolean);

      await Promise.all(promises);

      // Save absence colors
      await saveColors({ colors: { vacation: vacationColor, sick: sickColor }, restaurantId });

      toast.success('Farben gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loadingSkills || loadingColors) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([label, groupSkills]) => (
        <Card key={label}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupSkills.map(skill => (
              <div key={skill.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg border border-border shrink-0"
                  style={{ backgroundColor: skillColors[skill.id] || skill.color }}
                />
                <span className="text-sm font-medium flex-1">{skill.name}</span>
                <input
                  type="color"
                  value={skillColors[skill.id] || skill.color}
                  onChange={e => setSkillColors(prev => ({ ...prev, [skill.id]: e.target.value }))}
                  className="w-10 h-8 rounded cursor-pointer border border-border"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Abwesenheiten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border border-border shrink-0"
              style={{ backgroundColor: vacationColor }}
            />
            <span className="text-sm font-medium flex-1">Urlaub</span>
            <input
              type="color"
              value={vacationColor}
              onChange={e => setVacationColor(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-border"
            />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border border-border shrink-0"
              style={{ backgroundColor: sickColor }}
            />
            <span className="text-sm font-medium flex-1">Krank</span>
            <input
              type="color"
              value={sickColor}
              onChange={e => setSickColor(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-border"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || isSaving} className="w-full sm:w-auto">
        {saving || isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Speichern
      </Button>
    </div>
  );
}
