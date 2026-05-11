import { Icon } from "../components/ui";

type ModulePlaceholderProps = {
  title: string;
  description?: string;
};

const ModulePlaceholder = ({ title, description }: ModulePlaceholderProps) => {
  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl border border-border-muted bg-bg-light p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Icon iconName="FaLayerGroup" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{title}</h1>
            <p className="text-sm text-text-muted mt-2 max-w-3xl leading-relaxed">
              {description ??
                "This workspace is wired into the platform navigation. Use the live modules (Dashboard, Products, Users, Reports) for full workflows, or extend this screen with list and form components connected to the Laravel API."}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-border-muted bg-bg-main/60 p-5 text-sm text-text-muted">
        Tip: Role-based access is enforced on the API. If you receive a 403 response, ask an administrator to grant the
        matching permission in Roles &amp; Permissions.
      </div>
    </div>
  );
};

export default ModulePlaceholder;
