import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store/useStore';
import {
  BookOpen, HelpCircle, Video, Keyboard, LifeBuoy, Bug, Info
} from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';

interface RibbonAyudaProps {
  setIsShortcutsOpen: (open: boolean) => void;
  setIsGuideOpen: (open: boolean) => void;
  setIsAboutOpen: (open: boolean) => void;
}

export function RibbonAyuda({
  setIsShortcutsOpen,
  setIsGuideOpen,
  setIsAboutOpen
}: RibbonAyudaProps) {
  const { t } = useTranslation();
  const { addLog } = useStore();

  return (
    <div className="flex items-center h-full gap-0.5 min-w-max">
      {/* Documentación Group */}
      <RibbonGroup label={t('ribbon.groups.doc')}>
        <RibbonButton
          icon={BookOpen}
          label="ENOHSA"
          onClick={() => {
            window.open("https://www.argentina.gob.ar/obras-publicas/enohsa", "_blank");
            addLog("[Ayuda] Abriendo Referencias de Normas Técnicas ENOHSA.");
          }}
          subtitle={t('ribbon.subtitles.enohsa') || "Consultar especificaciones y directrices del ENOHSA"}
        />
        <RibbonButton
          icon={HelpCircle}
          label={t('ribbon.buttons.guia')}
          onClick={() => setIsGuideOpen(true)}
          subtitle={t('ribbon.subtitles.guia')}
        />
      </RibbonGroup>

      {/* Tutoriales Group */}
      <RibbonGroup label={t('ribbon.groups.tutoriales')}>
        <RibbonButton
          icon={Video}
          label={t('ribbon.buttons.videos')}
          onClick={() => {
            window.open("https://www.youtube.com", "_blank");
            addLog("[Ayuda] Abriendo canal de YouTube con tutoriales.");
          }}
          subtitle={t('ribbon.subtitles.videos')}
        />
      </RibbonGroup>

      {/* Atajos Group */}
      <RibbonGroup label={t('ribbon.groups.atajos')}>
        <RibbonButton
          icon={Keyboard}
          label={t('ribbon.buttons.teclado')}
          onClick={() => setIsShortcutsOpen(true)}
          subtitle={t('ribbon.subtitles.teclado')}
        />
      </RibbonGroup>

      {/* Soporte Group */}
      <RibbonGroup label={t('ribbon.groups.soporte')}>
        <RibbonButton
          icon={LifeBuoy}
          label={t('ribbon.buttons.contacto')}
          onClick={() => {
            const s = useStore.getState() as any;
            s.setSupportModalType('contact');
            s.setIsSupportModalOpen(true);
            addLog("[Ayuda] Abriendo formulario de contacto y soporte.");
          }}
          subtitle={t('ribbon.subtitles.contacto')}
        />
        <RibbonButton
          icon={Bug}
          label={t('ribbon.buttons.reportar')}
          onClick={() => {
            const s = useStore.getState() as any;
            s.setSupportModalType('bug');
            s.setIsSupportModalOpen(true);
            addLog("[Ayuda] Abriendo formulario para reportar un error.");
          }}
          subtitle={t('ribbon.subtitles.reportar')}
        />
      </RibbonGroup>

      {/* Acerca de Group */}
      <RibbonGroup label={t('ribbon.groups.acerca')}>
        <RibbonButton
          icon={Info}
          label="SewerWorks"
          onClick={() => setIsAboutOpen(true)}
          subtitle={t('ribbon.subtitles.acerca_software')}
        />
      </RibbonGroup>
    </div>
  );
}

export default RibbonAyuda;
