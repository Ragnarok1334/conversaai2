create table if not exists public.paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);
revoke all on table public.paypal_webhook_events from anon, authenticated, public;
alter table public.paypal_webhook_events enable row level security;

create or replace function public.fulfill_paypal_payment(p_payment_id uuid, p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_payment public.billing_payments%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_now timestamptz := now();
  v_plan text;
  v_assistants_limit integer;
  v_messages_limit integer;
  v_order_id text;
  v_order_status text;
  v_currency text;
  v_amount numeric;
  v_capture_id text;
begin
  if p_payment_id is null or p_order is null or jsonb_typeof(p_order) <> 'object' then
    return jsonb_build_object('success', false, 'code', 'invalid_input');
  end if;

  select * into v_payment from public.billing_payments where id = p_payment_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'payment_not_found'); end if;
  if v_payment.provider <> 'paypal' then return jsonb_build_object('success', false, 'code', 'invalid_provider'); end if;

  v_order_id := nullif(p_order->>'id', '');
  v_order_status := nullif(p_order->>'status', '');
  v_currency := nullif(p_order#>>'{purchase_units,0,amount,currency_code}', '');
  v_amount := nullif(p_order#>>'{purchase_units,0,amount,value}', '')::numeric;
  v_capture_id := nullif(p_order#>>'{purchase_units,0,payments,captures,0,id}', '');

  if v_order_id is null or v_payment.paypal_order_id is null or v_order_id <> v_payment.paypal_order_id then
    return jsonb_build_object('success', false, 'code', 'payment_mismatch');
  end if;
  if v_order_status <> 'COMPLETED' then return jsonb_build_object('success', false, 'code', 'payment_not_completed'); end if;
  if v_currency is null or v_currency <> v_payment.currency then return jsonb_build_object('success', false, 'code', 'currency_mismatch'); end if;
  if v_amount is null or v_amount <> (v_payment.amount::numeric / 100) then return jsonb_build_object('success', false, 'code', 'amount_mismatch'); end if;
  if v_capture_id is null then return jsonb_build_object('success', false, 'code', 'capture_not_found'); end if;

  if v_payment.status = 'paid' then
    return jsonb_build_object('success', true, 'code', 'already_processed', 'payment_id', v_payment.id, 'user_id', v_payment.user_id, 'plan', v_payment.plan);
  end if;

  v_plan := v_payment.plan;
  if v_plan = 'starter' then v_assistants_limit := 1; v_messages_limit := 500;
  elsif v_plan = 'pro' then v_assistants_limit := 3; v_messages_limit := 2500;
  elsif v_plan = 'growth' then v_assistants_limit := 8; v_messages_limit := 8000;
  elsif v_plan = 'business' then v_assistants_limit := 20; v_messages_limit := 20000;
  else return jsonb_build_object('success', false, 'code', 'invalid_paid_plan'); end if;

  update public.billing_payments
  set status = 'paid', paypal_capture_id = v_capture_id, raw_response = p_order, updated_at = v_now
  where id = v_payment.id;

  select * into v_subscription from public.subscriptions where user_id = v_payment.user_id for update;
  if found then
    update public.subscriptions set plan=v_plan,status='active',assistants_limit=v_assistants_limit,messages_limit=v_messages_limit,current_messages_used=0,current_period_start=v_now,current_period_end=v_now+interval '30 days',grace_ends_at=v_now+interval '32 days',cancel_at_period_end=false,cancelled_at=null,cancellation_reason=null,updated_at=v_now where id=v_subscription.id;
  else
    insert into public.subscriptions(user_id,plan,status,assistants_limit,messages_limit,current_messages_used,current_period_start,current_period_end,grace_ends_at,cancel_at_period_end,cancelled_at,cancellation_reason) values(v_payment.user_id,v_plan,'active',v_assistants_limit,v_messages_limit,0,v_now,v_now+interval '30 days',v_now+interval '32 days',false,null,null);
  end if;

  return jsonb_build_object('success', true, 'code', 'processed', 'payment_id', v_payment.id, 'user_id', v_payment.user_id, 'plan', v_plan);
end;
$function$;

revoke execute on function public.fulfill_paypal_payment(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.fulfill_paypal_payment(uuid, jsonb) to service_role;

