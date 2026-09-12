-- Changer le niveau d'accès d'un analyste sur une consultation (page
-- Paramètres) : même règle que la suppression, la route vérifie en plus que
-- l'appelant est pilote.
CREATE POLICY "Owner or admin can update assignments"
    ON public.rfp_user_assignments FOR UPDATE
    USING (user_can_access_rfp(rfp_id));
