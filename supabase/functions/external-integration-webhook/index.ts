import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase with service role key for RLS bypass
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get request IP for logging
  const requestIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    // Validate API Key from database
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.warn('Missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('integration_tokens')
      .select('id, name, is_active, expires_at, allowed_actions, usage_count')
      .eq('token', apiKey)
      .single();

    if (tokenError || !tokenData) {
      // Fallback to env variable for backwards compatibility
      const legacyApiKey = Deno.env.get('EXTERNAL_INTEGRATION_API_KEY');
      if (!legacyApiKey || apiKey !== legacyApiKey) {
        console.warn('Invalid API key');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Validate token from database
      if (!tokenData.is_active) {
        console.warn(`Token ${tokenData.name} is disabled`);
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Token is disabled' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        console.warn(`Token ${tokenData.name} has expired`);
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Token has expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const body = await req.json();
    const { action, data } = body;

    if (!action || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing action or data in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if action is allowed for this token
    if (tokenData && tokenData.allowed_actions && !tokenData.allowed_actions.includes(action)) {
      console.warn(`Action ${action} not allowed for token ${tokenData.name}`);
      
      // Log the failed attempt
      await supabase.from('integration_token_logs').insert({
        token_id: tokenData.id,
        action,
        request_ip: requestIp,
        request_payload: { action, data_keys: Object.keys(data) },
        response_status: 403,
        error_message: `Action ${action} not allowed`
      });

      return new Response(
        JSON.stringify({ error: `Action '${action}' is not allowed for this token` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing action: ${action} from token: ${tokenData?.name || 'legacy'}`);

    let result;

    switch (action) {
      case 'upsert_administrator':
        result = await upsertAdministrator(supabase, data);
        break;

      case 'upsert_condominium':
        result = await upsertCondominium(supabase, data);
        break;

      case 'upsert_unit':
        result = await upsertUnit(supabase, data);
        break;

      case 'upsert_charges':
        result = await upsertCharges(supabase, data);
        break;

      case 'upsert_agreement':
        result = await upsertAgreement(supabase, data);
        break;

      case 'upsert_extrajudicial':
        result = await upsertExtrajudicial(supabase, data);
        break;

      case 'bulk_import':
        result = await bulkImport(supabase, data);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update token usage stats and log success
    if (tokenData) {
      await supabase
        .from('integration_tokens')
        .update({ 
          last_used_at: new Date().toISOString(),
          usage_count: (tokenData.usage_count || 0) + 1
        })
        .eq('id', tokenData.id);

      await supabase.from('integration_token_logs').insert({
        token_id: tokenData.id,
        action,
        request_ip: requestIp,
        request_payload: { action, data_summary: Array.isArray(data) ? `${data.length} items` : 'single item' },
        response_status: 200
      });
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============ ADMINISTRATOR OPERATIONS ============

async function upsertAdministrator(supabase: any, data: any) {
  const { external_id, ...adminData } = data;
  
  // Check if administrator exists by external_id or CNPJ
  let existingAdmin = null;
  
  if (external_id) {
    const { data: found } = await supabase
      .from('administrators')
      .select('id')
      .eq('portal_username', external_id) // Using portal_username as external_id field
      .single();
    existingAdmin = found;
  }
  
  if (!existingAdmin && data.cnpj) {
    const { data: found } = await supabase
      .from('administrators')
      .select('id')
      .eq('cnpj', data.cnpj.replace(/\D/g, ''))
      .single();
    existingAdmin = found;
  }

  if (existingAdmin) {
    const { data: updated, error } = await supabase
      .from('administrators')
      .update({
        ...adminData,
        portal_username: external_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingAdmin.id)
      .select()
      .single();
    
    if (error) throw error;
    return { administrator: updated, operation: 'updated' };
  } else {
    const { data: created, error } = await supabase
      .from('administrators')
      .insert({
        ...adminData,
        portal_username: external_id
      })
      .select()
      .single();
    
    if (error) throw error;
    return { administrator: created, operation: 'created' };
  }
}

// ============ CONDOMINIUM OPERATIONS ============

async function upsertCondominium(supabase: any, data: any) {
  const { external_id, administrator_external_id, ...condoData } = data;
  
  // Find administrator
  let administratorId = data.administrator_id;
  if (!administratorId && administrator_external_id) {
    const { data: admin } = await supabase
      .from('administrators')
      .select('id')
      .eq('portal_username', administrator_external_id)
      .single();
    administratorId = admin?.id;
  }

  // Check if condominium exists
  let existingCondo = null;
  if (external_id && administratorId) {
    const { data: found } = await supabase
      .from('condominiums')
      .select('id')
      .eq('name', data.name)
      .eq('administrator_id', administratorId)
      .single();
    existingCondo = found;
  }

  if (existingCondo) {
    const { data: updated, error } = await supabase
      .from('condominiums')
      .update({
        ...condoData,
        administrator_id: administratorId,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCondo.id)
      .select()
      .single();
    
    if (error) throw error;
    return { condominium: updated, operation: 'updated' };
  } else {
    const { data: created, error } = await supabase
      .from('condominiums')
      .insert({
        ...condoData,
        administrator_id: administratorId
      })
      .select()
      .single();
    
    if (error) throw error;
    return { condominium: created, operation: 'created' };
  }
}

// ============ UNIT OPERATIONS ============

async function upsertUnit(supabase: any, data: any) {
  const { external_id, condominium_name, administrator_external_id, ...unitData } = data;
  
  // Find condominium
  let condominiumId = data.condominium_id;
  if (!condominiumId && condominium_name) {
    let query = supabase
      .from('condominiums')
      .select('id')
      .eq('name', condominium_name);
    
    if (administrator_external_id) {
      const { data: admin } = await supabase
        .from('administrators')
        .select('id')
        .eq('portal_username', administrator_external_id)
        .single();
      
      if (admin) {
        query = query.eq('administrator_id', admin.id);
      }
    }
    
    const { data: condo } = await query.single();
    condominiumId = condo?.id;
  }

  if (!condominiumId) {
    throw new Error('Could not find condominium for unit');
  }

  // Check if unit exists
  let existingUnit = null;
  const { data: found } = await supabase
    .from('units')
    .select('id')
    .eq('condominium_id', condominiumId)
    .eq('unit_number', data.unit_number)
    .single();
  existingUnit = found;

  if (existingUnit) {
    const { data: updated, error } = await supabase
      .from('units')
      .update({
        ...unitData,
        condominium_id: condominiumId,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUnit.id)
      .select()
      .single();
    
    if (error) throw error;
    return { unit: updated, operation: 'updated' };
  } else {
    const { data: created, error } = await supabase
      .from('units')
      .insert({
        ...unitData,
        condominium_id: condominiumId
      })
      .select()
      .single();
    
    if (error) throw error;
    return { unit: created, operation: 'created' };
  }
}

// ============ CHARGES OPERATIONS ============

async function upsertCharges(supabase: any, charges: any[]) {
  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[]
  };

  for (const charge of charges) {
    try {
      const { 
        external_id, 
        unit_external_id, 
        condominium_name,
        administrator_external_id,
        agreement_external_id,
        extrajudicial_external_id,
        ...chargeData 
      } = charge;

      // Find unit
      let unitId = charge.unit_id;
      if (!unitId && unit_external_id) {
        // Parse unit_external_id format: "CONDO-BLOCK-UNIT" or similar
        const parts = unit_external_id.split('-');
        
        // Try to find by condominium name and unit number
        if (condominium_name) {
          const { data: condo } = await supabase
            .from('condominiums')
            .select('id')
            .eq('name', condominium_name)
            .single();

          if (condo) {
            const unitNumber = parts[parts.length - 1];
            const { data: unit } = await supabase
              .from('units')
              .select('id')
              .eq('condominium_id', condo.id)
              .eq('unit_number', unitNumber)
              .single();
            unitId = unit?.id;
          }
        }
      }

      if (!unitId) {
        results.errors.push(`Unit not found for charge: ${external_id || JSON.stringify(charge)}`);
        continue;
      }

      // Find agreement if specified
      let agreementId = charge.agreement_id;
      if (!agreementId && agreement_external_id) {
        const { data: agreement } = await supabase
          .from('agreements')
          .select('id')
          .eq('external_id', agreement_external_id)
          .single();
        agreementId = agreement?.id;
      }

      // Find extrajudicial case if specified
      let extrajudicialId = charge.extrajudicial_case_id;
      if (!extrajudicialId && extrajudicial_external_id) {
        const { data: extrajudicial } = await supabase
          .from('extrajudicial_cases')
          .select('id')
          .eq('external_id', extrajudicial_external_id)
          .single();
        extrajudicialId = extrajudicial?.id;
      }

      // Check if charge exists
      let existingCharge = null;
      if (external_id) {
        const { data: found } = await supabase
          .from('charges')
          .select('id')
          .eq('external_id', external_id)
          .single();
        existingCharge = found;
      }

      const chargePayload = {
        ...chargeData,
        unit_id: unitId,
        external_id,
        agreement_id: agreementId || null,
        extrajudicial_case_id: extrajudicialId || null,
        charge_type: chargeData.charge_type || 'regular'
      };

      if (existingCharge) {
        const { error } = await supabase
          .from('charges')
          .update({
            ...chargePayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCharge.id);
        
        if (error) throw error;
        results.updated++;
      } else {
        const { error } = await supabase
          .from('charges')
          .insert(chargePayload);
        
        if (error) throw error;
        results.created++;
      }
    } catch (error: any) {
      results.errors.push(`Error processing charge: ${error.message}`);
    }
  }

  return { charges: results };
}

// ============ AGREEMENT OPERATIONS ============

async function upsertAgreement(supabase: any, data: any) {
  const {
    external_id,
    unit_external_id,
    condominium_name,
    administrator_external_id,
    installments,
    ...agreementData
  } = data;

  // Find unit
  let unitId = data.unit_id;
  if (!unitId && unit_external_id) {
    if (condominium_name) {
      let adminId = null;
      if (administrator_external_id) {
        const { data: admin } = await supabase
          .from('administrators')
          .select('id')
          .eq('portal_username', administrator_external_id)
          .single();
        adminId = admin?.id;
      }

      let condoQuery = supabase
        .from('condominiums')
        .select('id')
        .eq('name', condominium_name);
      
      if (adminId) {
        condoQuery = condoQuery.eq('administrator_id', adminId);
      }

      const { data: condo } = await condoQuery.single();

      if (condo) {
        const parts = unit_external_id.split('-');
        const unitNumber = parts[parts.length - 1];
        
        const { data: unit } = await supabase
          .from('units')
          .select('id')
          .eq('condominium_id', condo.id)
          .eq('unit_number', unitNumber)
          .single();
        unitId = unit?.id;
      }
    }
  }

  if (!unitId) {
    throw new Error('Could not find unit for agreement');
  }

  // Find administrator
  let administratorId = data.administrator_id;
  if (!administratorId && administrator_external_id) {
    const { data: admin } = await supabase
      .from('administrators')
      .select('id')
      .eq('portal_username', administrator_external_id)
      .single();
    administratorId = admin?.id;
  }

  // Check if agreement exists
  let existingAgreement = null;
  if (external_id) {
    const { data: found } = await supabase
      .from('agreements')
      .select('id')
      .eq('external_id', external_id)
      .single();
    existingAgreement = found;
  }

  let agreementId;

  if (existingAgreement) {
    const { data: updated, error } = await supabase
      .from('agreements')
      .update({
        ...agreementData,
        unit_id: unitId,
        administrator_id: administratorId,
        external_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingAgreement.id)
      .select()
      .single();
    
    if (error) throw error;
    agreementId = updated.id;
  } else {
    const { data: created, error } = await supabase
      .from('agreements')
      .insert({
        ...agreementData,
        unit_id: unitId,
        administrator_id: administratorId,
        external_id
      })
      .select()
      .single();
    
    if (error) throw error;
    agreementId = created.id;
  }

  // Create installment charges if provided
  if (installments && Array.isArray(installments)) {
    const installmentCharges = installments.map((inst: any) => ({
      unit_id: unitId,
      administrator_id: administratorId,
      agreement_id: agreementId,
      charge_type: 'acordo',
      amount: inst.amount,
      due_date: inst.due_date,
      installment_number: inst.number,
      status: inst.status || 'pending',
      description: `Parcela ${inst.number}/${installments.length} - Acordo`,
      external_id: inst.external_id || `${external_id}-P${inst.number}`
    }));

    // Delete existing installment charges for this agreement
    await supabase
      .from('charges')
      .delete()
      .eq('agreement_id', agreementId);

    // Insert new installment charges
    const { error } = await supabase
      .from('charges')
      .insert(installmentCharges);
    
    if (error) throw error;
  }

  return { 
    agreement_id: agreementId, 
    operation: existingAgreement ? 'updated' : 'created',
    installments_created: installments?.length || 0
  };
}

// ============ EXTRAJUDICIAL OPERATIONS ============

async function upsertExtrajudicial(supabase: any, data: any) {
  const {
    external_id,
    unit_external_id,
    condominium_name,
    administrator_external_id,
    related_charge_ids,
    ...caseData
  } = data;

  // Find unit (similar logic to agreement)
  let unitId = data.unit_id;
  if (!unitId && unit_external_id) {
    if (condominium_name) {
      let adminId = null;
      if (administrator_external_id) {
        const { data: admin } = await supabase
          .from('administrators')
          .select('id')
          .eq('portal_username', administrator_external_id)
          .single();
        adminId = admin?.id;
      }

      let condoQuery = supabase
        .from('condominiums')
        .select('id')
        .eq('name', condominium_name);
      
      if (adminId) {
        condoQuery = condoQuery.eq('administrator_id', adminId);
      }

      const { data: condo } = await condoQuery.single();

      if (condo) {
        const parts = unit_external_id.split('-');
        const unitNumber = parts[parts.length - 1];
        
        const { data: unit } = await supabase
          .from('units')
          .select('id')
          .eq('condominium_id', condo.id)
          .eq('unit_number', unitNumber)
          .single();
        unitId = unit?.id;
      }
    }
  }

  if (!unitId) {
    throw new Error('Could not find unit for extrajudicial case');
  }

  // Find administrator
  let administratorId = data.administrator_id;
  if (!administratorId && administrator_external_id) {
    const { data: admin } = await supabase
      .from('administrators')
      .select('id')
      .eq('portal_username', administrator_external_id)
      .single();
    administratorId = admin?.id;
  }

  // Check if case exists
  let existingCase = null;
  if (external_id) {
    const { data: found } = await supabase
      .from('extrajudicial_cases')
      .select('id')
      .eq('external_id', external_id)
      .single();
    existingCase = found;
  }

  const casePayload = {
    ...caseData,
    unit_id: unitId,
    administrator_id: administratorId,
    external_id,
    related_charges: related_charge_ids || []
  };

  let caseId;

  if (existingCase) {
    const { data: updated, error } = await supabase
      .from('extrajudicial_cases')
      .update({
        ...casePayload,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCase.id)
      .select()
      .single();
    
    if (error) throw error;
    caseId = updated.id;
  } else {
    const { data: created, error } = await supabase
      .from('extrajudicial_cases')
      .insert(casePayload)
      .select()
      .single();
    
    if (error) throw error;
    caseId = created.id;
  }

  // Update related charges if provided
  if (related_charge_ids && Array.isArray(related_charge_ids)) {
    // Find charges by external_id and link them
    for (const chargeExternalId of related_charge_ids) {
      await supabase
        .from('charges')
        .update({ 
          extrajudicial_case_id: caseId,
          charge_type: 'extrajudicial'
        })
        .eq('external_id', chargeExternalId);
    }
  }

  return {
    extrajudicial_case_id: caseId,
    operation: existingCase ? 'updated' : 'created'
  };
}

// ============ BULK IMPORT ============

async function bulkImport(supabase: any, data: any) {
  const results = {
    administrator: null as any,
    condominiums: { created: 0, updated: 0, errors: [] as string[] },
    units: { created: 0, updated: 0, errors: [] as string[] },
    charges: { created: 0, updated: 0, errors: [] as string[] },
    agreements: { created: 0, updated: 0, errors: [] as string[] },
    extrajudicial_cases: { created: 0, updated: 0, errors: [] as string[] }
  };

  // 1. Import administrator
  if (data.administrator) {
    try {
      results.administrator = await upsertAdministrator(supabase, data.administrator);
    } catch (error: any) {
      results.administrator = { error: error.message };
    }
  }

  // 2. Import condominiums
  if (data.condominiums && Array.isArray(data.condominiums)) {
    for (const condo of data.condominiums) {
      try {
        const result = await upsertCondominium(supabase, {
          ...condo,
          administrator_external_id: data.administrator?.external_id
        });
        if (result.operation === 'created') results.condominiums.created++;
        else results.condominiums.updated++;
      } catch (error: any) {
        results.condominiums.errors.push(`${condo.name}: ${error.message}`);
      }
    }
  }

  // 3. Import units
  if (data.units && Array.isArray(data.units)) {
    for (const unit of data.units) {
      try {
        const result = await upsertUnit(supabase, {
          ...unit,
          administrator_external_id: data.administrator?.external_id
        });
        if (result.operation === 'created') results.units.created++;
        else results.units.updated++;
      } catch (error: any) {
        results.units.errors.push(`${unit.unit_number}: ${error.message}`);
      }
    }
  }

  // 4. Import agreements
  if (data.agreements && Array.isArray(data.agreements)) {
    for (const agreement of data.agreements) {
      try {
        const result = await upsertAgreement(supabase, {
          ...agreement,
          administrator_external_id: data.administrator?.external_id
        });
        if (result.operation === 'created') results.agreements.created++;
        else results.agreements.updated++;
      } catch (error: any) {
        results.agreements.errors.push(`${agreement.external_id}: ${error.message}`);
      }
    }
  }

  // 5. Import extrajudicial cases
  if (data.extrajudicial_cases && Array.isArray(data.extrajudicial_cases)) {
    for (const extCase of data.extrajudicial_cases) {
      try {
        const result = await upsertExtrajudicial(supabase, {
          ...extCase,
          administrator_external_id: data.administrator?.external_id
        });
        if (result.operation === 'created') results.extrajudicial_cases.created++;
        else results.extrajudicial_cases.updated++;
      } catch (error: any) {
        results.extrajudicial_cases.errors.push(`${extCase.external_id}: ${error.message}`);
      }
    }
  }

  // 6. Import charges (after agreements and extrajudicial for proper linking)
  if (data.charges && Array.isArray(data.charges)) {
    const chargesResult = await upsertCharges(supabase, data.charges.map((c: any) => ({
      ...c,
      administrator_external_id: data.administrator?.external_id
    })));
    results.charges = chargesResult.charges;
  }

  return results;
}
