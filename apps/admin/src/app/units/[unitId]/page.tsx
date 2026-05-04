import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getUnit } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { endMembershipAction, inviteResidentToUnitAction, updateMembershipProfileAction } from "../actions";

interface UnitDetailPageProps {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ invited?: string; updated?: string }>;
}

export default async function UnitDetailPage({ params, searchParams }: UnitDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { unitId } = await params;
  const { invited, updated } = await searchParams;
  const [unit, t] = await Promise.all([getUnit(unitId), getTranslations("Registry")]);

  if (!unit) notFound();

  const memberships = unit.memberships ?? [];
  const activeMemberships = memberships.filter((membership) => !membership.endsAt);
  const endedMemberships = memberships.length - activeMemberships.length;
  const notSetLabel = t("unitDetail.common.notSet");
  const visibleLabel = t("unitDetail.common.visible");
  const hiddenLabel = t("unitDetail.common.hidden");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("backToBuilding"), href: `/buildings/${unit.buildingId}` }, { label: `${t("unit")} ${unit.unitNumber}` }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/buildings/${unit.buildingId}`}>
              {t("backToBuilding")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("unit")} {unit.unitNumber}</h1>
            <p className="mt-2 text-sm text-muted">
              <span className="font-semibold text-foreground uppercase">{unit.status}</span>
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t("unitDetail.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand" href={`/buildings/${unit.buildingId}/units/${unit.id}/edit`}>
              {t("editUnit")}
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" href="/documents">
              {t("documents")}
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand" href="/onboarding">
              {t("onboarding")}
            </Link>

          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {updated ? (
          <p className="mb-5 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("unitDetail.messages.updated")}
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("unitDetail.metrics.activeMemberships.title")}</p>
            <p className="mt-2 text-2xl font-semibold">{activeMemberships.length}</p>
            <p className="mt-1 text-sm text-muted">{t("unitDetail.metrics.activeMemberships.description")}</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("unitDetail.metrics.membershipHistory.title")}</p>
            <p className="mt-2 text-2xl font-semibold">{endedMemberships}</p>
            <p className="mt-1 text-sm text-muted">{t("unitDetail.metrics.membershipHistory.description")}</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("unitDetail.metrics.operatorGuidance.title")}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{t("unitDetail.metrics.operatorGuidance.lead")}</p>
            <p className="mt-1 text-sm text-muted">{t("unitDetail.metrics.operatorGuidance.description")}</p>
          </article>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">{t("unitMemberships")}</h2>
            <p className="mt-1 text-sm text-muted">{t("unitDetail.memberships.description")}</p>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("user")}</th>
                <th className="px-4 py-3 font-semibold">{t("relation")}</th>
                <th className="px-4 py-3 font-semibold">{t("verification")}</th>
                <th className="px-4 py-3 font-semibold">{t("dates")}</th>
                <th className="px-4 py-3 font-semibold">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {memberships.length === 0 ? (
                <tr>
                  <td className="px-4 py-8" colSpan={5}>
                    <p className="font-medium text-foreground">{t("noLinkedUsers")}</p>
                    <p className="mt-2 text-sm text-muted">{t("unitDetail.memberships.empty.description")}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                        href="#invite-resident"
                      >
                        {t("unitDetail.memberships.empty.inviteNewResident")}
                      </a>
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                        href="/units/assign"
                      >
                        {t("unitDetail.memberships.empty.assignExistingUser")}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                memberships.map((membership) => (
                  <Fragment key={membership.id}>
                    <tr>
                      <td className="px-4 py-4">
                        <div className="font-semibold">{membership.user?.name ?? t("unitDetail.memberships.userFallback", { id: membership.userId })}</div>
                        <div className="text-muted">{membership.user?.email ?? t("noEmail")}</div>
                        <div className="mt-2 text-xs text-muted">
                          {t("unitDetail.memberships.profileSummary", {
                            residentName: membership.residentName ?? notSetLabel,
                            residentPhone: membership.residentPhone ?? notSetLabel,
                            phoneVisibility: membership.phonePublic ? visibleLabel : hiddenLabel,
                            residentEmail: membership.residentEmail ?? notSetLabel,
                            emailVisibility: membership.emailPublic ? visibleLabel : hiddenLabel,
                          })}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {t("unitDetail.memberships.vehicleSummary", {
                            vehicle: membership.hasVehicle
                              ? membership.vehiclePlate ?? t("unitDetail.common.registeredWithoutPlate")
                              : t("unitDetail.common.noVehicleOnFile"),
                            parking: membership.parkingSpotCode ?? notSetLabel,
                            sticker: membership.garageStickerCode ?? notSetLabel,
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4 capitalize">{membership.relationType}</td>
                      <td className="px-4 py-4">
                        <div className="capitalize">{membership.verificationStatus.replace("_", " ")}</div>
                        {!membership.endsAt && membership.verificationStatus !== "verified" ? (
                          <div className="mt-1 text-xs text-muted">
                            {t("unitDetail.memberships.verificationPending")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        {membership.startsAt ?? t("noStart")} - {membership.endsAt ?? t("current")}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted">
                            {membership.endsAt
                              ? t("unitDetail.memberships.historicalMembership")
                              : t("unitDetail.memberships.activeMembershipHint")}
                          </p>
                          {!membership.endsAt ? (
                            <form action={endMembershipAction.bind(null, unit.id, membership.id)}>
                              <button className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-danger hover:text-danger" type="submit">
                                {t("end")}
                              </button>
                            </form>
                          ) : (
                            <div className="text-sm text-muted">
                              <div>{t("ended")}</div>
                              <div className="mt-1 text-xs">{t("unitDetail.memberships.endedNote")}</div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-background/35">
                      <td className="px-4 py-4" colSpan={5}>
                        <details className="group rounded-lg border border-line bg-panel">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{t("unitDetail.editor.title")}</p>
                              <p className="mt-1 text-xs text-muted">{t("unitDetail.editor.description")}</p>
                            </div>
                            <span className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-muted group-open:border-brand group-open:text-brand">
                              {t("unitDetail.editor.open")}
                            </span>
                          </summary>
                          <div className="border-t border-line px-4 py-4">
                            <div className="rounded-lg border border-line bg-background/60 px-4 py-3 text-sm">
                              <p className="font-medium text-foreground">{t("unitDetail.editor.operatorNoteTitle")}</p>
                              <p className="mt-1 text-muted">
                                {t("unitDetail.editor.operatorNotePrefix")}{" "}
                                <Link className="ml-1 font-semibold text-brand hover:text-brand-strong" href="/units/assign">
                                  {t("assignApartment.title")}
                                </Link>
                                {t("unitDetail.editor.operatorNoteSuffix")}
                              </p>
                            </div>

                            <form action={updateMembershipProfileAction.bind(null, unit.id, membership.id)} className="mt-4 grid gap-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-medium">
                                  {t("unitDetail.editor.residentName")}
                                  <input
                                    className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                                    defaultValue={membership.residentName ?? membership.user?.name ?? ""}
                                    name="residentName"
                                  />
                                </label>
                                <label className="text-sm font-medium">
                                  {t("unitDetail.editor.residentPhone")}
                                  <input
                                    className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                                    defaultValue={membership.residentPhone ?? membership.user?.phone ?? ""}
                                    name="residentPhone"
                                  />
                                </label>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="flex items-center gap-2 rounded-lg border border-line bg-background/60 px-3 py-3 text-sm font-medium">
                                  <input className="size-4" defaultChecked={membership.phonePublic} name="phonePublic" type="checkbox" />
                                  {t("unitDetail.editor.showPhone")}
                                </label>
                                <label className="text-sm font-medium">
                                  {t("unitDetail.editor.residentEmail")}
                                  <input
                                    className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                                    defaultValue={membership.residentEmail ?? membership.user?.email ?? ""}
                                    name="residentEmail"
                                    type="email"
                                  />
                                </label>
                              </div>

                              <label className="flex items-center gap-2 rounded-lg border border-line bg-background/60 px-3 py-3 text-sm font-medium">
                                <input className="size-4" defaultChecked={membership.emailPublic} name="emailPublic" type="checkbox" />
                                {t("unitDetail.editor.showEmail")}
                              </label>

                              <div className="rounded-lg border border-line bg-background/60 p-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                  <input className="size-4" defaultChecked={membership.hasVehicle} name="hasVehicle" type="checkbox" />
                                  {t("unitDetail.editor.vehicleRegistered")}
                                </label>
                                <p className="mt-2 text-xs text-muted">
                                  {t("unitDetail.editor.vehicleHint")}
                                </p>
                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                  <label className="text-sm font-medium">
                                    {t("unitDetail.editor.vehiclePlate")}
                                    <input
                                      className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                                      defaultValue={membership.vehiclePlate ?? ""}
                                      name="vehiclePlate"
                                    />
                                  </label>
                                  <label className="text-sm font-medium">
                                    {t("unitDetail.editor.parkingCode")}
                                    <input
                                      className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                                      defaultValue={membership.parkingSpotCode ?? ""}
                                      name="parkingSpotCode"
                                    />
                                  </label>
                                  <label className="text-sm font-medium">
                                    {t("unitDetail.editor.garageSticker")}
                                    <input
                                      className="mt-2 h-11 w-full rounded-lg border border-line px-3"
                                      defaultValue={membership.garageStickerCode ?? ""}
                                      name="garageStickerCode"
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-muted">{t("unitDetail.editor.saveHint")}</p>
                                <button className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
                                  {t("unitDetail.editor.save")}
                                </button>
                              </div>
                            </form>
                          </div>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form action={inviteResidentToUnitAction.bind(null, unit.id)} className="rounded-lg border border-line bg-panel p-5" id="invite-resident">
          <h2 className="text-lg font-semibold">{t("inviteResident")}</h2>
          <div className="mt-3 rounded-lg border border-line bg-background/60 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{t("unitDetail.invitePanel.title")}</p>
            <p className="mt-1 text-muted">
              {t("unitDetail.invitePanel.descriptionPrefix")}{" "}
              <Link className="ml-1 font-semibold text-brand hover:text-brand-strong" href="/units/assign">
                {t("unitDetail.invitePanel.assignInstead")}
              </Link>
              {t("unitDetail.invitePanel.descriptionSuffix")}
            </p>
          </div>
          {invited ? (
            <p className="mt-2 rounded-lg bg-[#e6f3ef] px-3 py-2 text-sm font-medium text-brand">
              {t("invitationCreated")} {t("unitDetail.messages.invited")}
            </p>
          ) : null}
          {memberships.length === 0 ? (
            <p className="mt-2 rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-3 py-2 text-sm text-[#7a5d1a]">
              {t("unitDetail.invitePanel.emptyMembershipHint")}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium">
              {t("name")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="name" required />
            </label>
            <label className="text-sm font-medium">
              {t("email")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="email" type="email" required />
            </label>
            <label className="text-sm font-medium">
              {t("phone")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="phone" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                {t("role")}
                <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="role" defaultValue="resident_owner">
                  <option value="resident_owner">{t("residentOwner")}</option>
                  <option value="resident_tenant">{t("residentTenant")}</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                {t("relation")}
                <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="relationType" defaultValue="resident">
                  <option value="owner">{t("owner")}</option>
                  <option value="tenant">{t("tenant")}</option>
                  <option value="resident">{t("resident")}</option>
                  <option value="representative">{t("representative")}</option>
                </select>
              </label>
            </div>
            <label className="text-sm font-medium">
              {t("startDate")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="startsAt" type="date" />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input className="size-4" name="isPrimary" type="checkbox" />
              {t("primaryContact")}
            </label>
            <p className="text-xs text-muted">{t("unitDetail.invitePanel.roleHint")}</p>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            {t("createInvite")}
          </button>
        </form>
      </section>
    </main>
  );
}
