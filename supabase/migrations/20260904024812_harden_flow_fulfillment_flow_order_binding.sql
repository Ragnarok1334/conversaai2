create or replace function public.fulfill_flow_payment(p_payment_id uuid, p_flow_status jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.billing_payments%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_now timestamptz := now();
  v_plan text;
  v_assistants_limit integer;
  v_messages_limit integer;
  v_was_cancelled boolean;
begin
  if p_payment_id is null or p_flow_status is null or jsonb_typeof(p_flow_status) <> 'object' then
    return jsonb_build_object('success', false, 'code', 'invalid_input');
  end if;

  select * into v_payment from public.billing_payments where id = p_payment_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'payment_not_found'); end if;
  if v_payment.provider <> 'flow' then return jsonb_build_object('success', false, 'code', 'invalid_provider'); end if;

  if p_flow_status->>'flowOrder' is null
     or v_payment.flow_order is null
     or p_flow_status->>'commerceOrder' is null
     or p_flow_status->>'commerceOrder' <> v_payment.flow_order
     or p_flow_status->>'currency' is null
     or p_flow_status->>'currency' <> v_payment.currency
     or p_flow_status->>'amount' is null
     or p_flow_status->>'amount' !~ '^[0-9]+(\.[0-9]+)?$'
     or (p_flow_status->>'amount')::numeric <> v_payment.amount::numeric then
    return jsonb_build_object('success', false, 'code', 'payment_mismatch');
  end if;

  if coalesce((p_flow_status->>'status')::integer, 0) <> 2 then
    return jsonb_build_object('success', false, 'code', 'payment_not_paid');
  end if;

  if v_payment.status = 'paid' then
    return jsonb_build_object('success', true, 'code', 'already_processed', 'payment_id', v_payment.id, 'user_id', v_payment.user_id, 'plan', v_payment.plan);
  end if;

  v_was_cancelled := v_payment.status = 'cancelled';
  v_plan := v_payment.plan;
  if v_plan = 'starter' then v_assistants_limit := 1; v_messages_limit := 500;
  elsif v_plan = 'pro' then v_assistants_limit := 3; v_messages_limit := 2500;
  elsif v_plan = 'growth' then v_assistants_limit := 8; v_messages_limit := 8000;
  elsif v_plan = 'business' then v_assistants_limit := 20; v_messages_limit := 20000;
  else return jsonb_build_object('success', false, 'code', 'invalid_paid_plan'); end if;

  update public.billing_payments
  set status = 'paid', raw_response = p_flow_status,
      metadata = coalesce(metadata, '{}'::jsonb) || case when v_was_cancelled then jsonb_build_object('recoveredFromCancelled', true) else '{}'::jsonb end,
      updated_at = v_now
  where id = v_payment.id;

  select * into v_subscription from public.subscriptions where user_id = v_payment.user_id for update;
  if found then
    update public.subscriptions set plan=v_plan,status='active',assistants_limit=v_assistants_limit,messages_limit=v_messages_limit,current_messages_used=0,current_period_start=v_now,current_period_end=v_now+interval '30 days',grace_ends_at=v_now+interval '32 days',cancel_at_period_end=false,cancelled_at=null,cancellation_reason=null,updated_at=v_now where id=v_subscription.id;
  else
    insert into public.subscriptions(user_id,plan,status,assistants_limit,messages_limit,current_messages_used,current_period_start,current_period_end,grace_ends_at,cancel_at_period_end,cancelled_at,cancellation_reason) values(v_payment.user_id,v_plan,'active',v_assistants_limit,v_messages_limit,0,v_now,v_now+interval '30 days',v_now+interval '32 days',false,null,null);
  end if;

  return jsonb_build_object('success', true, 'code', 'processed', 'payment_id', v_payment.id, 'user_id', v_payment.user_id, 'plan', v_plan);
end;
$$;