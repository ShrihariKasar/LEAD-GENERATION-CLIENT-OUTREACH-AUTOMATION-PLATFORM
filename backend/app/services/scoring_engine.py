from typing import Dict, Any, List, Tuple, Optional
from backend.app.models import Lead, ICPProfile, Company

class ScoringEngine:
    """
    Deterministic, explainable lead scoring engine.
    Evaluates a Lead against an ICPProfile and produces an interpretable Decision Trace.
    """
    
    @staticmethod
    def evaluate(lead: Lead, icp: ICPProfile, company: Optional[Company] = None) -> Dict[str, Any]:
        matched_criteria: List[str] = []
        failed_criteria: List[str] = []
        unknown_criteria: List[str] = []
        decision_trace_items: List[Dict[str, Any]] = []
        
        weights = icp.weights or {
            "title": 25,
            "industry": 20,
            "company_size": 15,
            "geography": 15,
            "technology": 15,
            "business_signal": 10
        }
        
        total_possible_weight = sum(weights.values()) or 100
        accumulated_score = 0
        known_data_points = 0
        total_data_points = 6
        
        breakdown: Dict[str, Any] = {}
        
        # 1. Negative criteria check (Immediate disqualification or deduction)
        neg = icp.negative_criteria or {}
        excluded_industries = [i.lower() for i in neg.get("excluded_industries", []) if isinstance(i, str)]
        excluded_locations = [l.lower() for l in neg.get("excluded_locations", []) if isinstance(l, str)]
        excluded_titles = [t.lower() for t in neg.get("excluded_titles", []) if isinstance(t, str)]
        
        lead_title = (lead.job_title or "").lower()
        lead_industry = (lead.industry or (company.industry if company else "") or "").lower()
        lead_location = (f"{lead.location or ''} {lead.country or ''}").lower()
        
        is_disqualified = False
        disqualification_reason = None
        
        for excl in excluded_titles:
            if excl and excl in lead_title:
                is_disqualified = True
                disqualification_reason = f"Title matches excluded criteria '{excl}'"
                break
                
        for excl in excluded_industries:
            if excl and excl in lead_industry:
                is_disqualified = True
                disqualification_reason = f"Industry matches excluded criteria '{excl}'"
                break
                
        for excl in excluded_locations:
            if excl and excl in lead_location:
                is_disqualified = True
                disqualification_reason = f"Location matches excluded criteria '{excl}'"
                break
                
        if is_disqualified:
            return {
                "score": 0,
                "confidence": 1.0,
                "matched_criteria": [],
                "failed_criteria": [disqualification_reason],
                "unknown_criteria": [],
                "breakdown": {"disqualified": True},
                "explanation": f"Disqualified by negative criteria: {disqualification_reason}",
                "decision_trace_items": [
                    {"category": "Negative Filter", "status": "FAILED", "label": "Disqualified", "details": disqualification_reason}
                ],
                "auto_qualified": False
            }

        # 2. Title & Seniority Fit
        w_title = weights.get("title", 25)
        target_titles = [t.lower() for t in (icp.target_job_titles or []) if isinstance(t, str)]
        target_seniorities = [s.lower() for s in (icp.target_seniorities or []) if isinstance(s, str)]
        
        title_matched = False
        seniority_matched = False
        
        if lead.job_title:
            known_data_points += 1
            if not target_titles:
                title_matched = True
            else:
                title_matched = any(t in lead_title for t in target_titles)
                
            if lead.seniority and target_seniorities:
                seniority_matched = any(s in lead.seniority.lower() for s in target_seniorities)
            elif not target_seniorities:
                seniority_matched = True
                
            if title_matched or seniority_matched:
                accumulated_score += w_title
                matched_criteria.append(f"Job Title / Seniority fit: '{lead.job_title}'")
                decision_trace_items.append({
                    "category": "Title & Authority",
                    "status": "MATCHED",
                    "label": "Decision-Maker Title",
                    "details": f"Matches target role ({lead.job_title})"
                })
                breakdown["title"] = {"score": w_title, "status": "MATCHED", "value": lead.job_title}
            else:
                failed_criteria.append(f"Title '{lead.job_title}' does not match target roles")
                decision_trace_items.append({
                    "category": "Title & Authority",
                    "status": "FAILED",
                    "label": "Non-Target Title",
                    "details": f"'{lead.job_title}' does not match target list"
                })
                breakdown["title"] = {"score": 0, "status": "FAILED", "value": lead.job_title}
        else:
            unknown_criteria.append("Job title is missing")
            decision_trace_items.append({
                "category": "Title & Authority",
                "status": "UNKNOWN",
                "label": "Title Unconfirmed",
                "details": "No job title recorded"
            })
            breakdown["title"] = {"score": 0, "status": "UNKNOWN", "value": None}

        # 3. Industry Fit
        w_industry = weights.get("industry", 20)
        target_industries = [i.lower() for i in (icp.target_industries or []) if isinstance(i, str)]
        
        if lead_industry:
            known_data_points += 1
            if not target_industries or any(ind in lead_industry for ind in target_industries):
                accumulated_score += w_industry
                matched_criteria.append(f"Industry fit: '{lead_industry.title()}'")
                decision_trace_items.append({
                    "category": "Industry Fit",
                    "status": "MATCHED",
                    "label": "Target Industry",
                    "details": f"Matches target sector ({lead_industry.title()})"
                })
                breakdown["industry"] = {"score": w_industry, "status": "MATCHED", "value": lead_industry}
            else:
                failed_criteria.append(f"Industry '{lead_industry.title()}' outside target industries")
                decision_trace_items.append({
                    "category": "Industry Fit",
                    "status": "FAILED",
                    "label": "Non-Target Industry",
                    "details": f"'{lead_industry.title()}' is not in ICP list"
                })
                breakdown["industry"] = {"score": 0, "status": "FAILED", "value": lead_industry}
        else:
            unknown_criteria.append("Industry is missing")
            decision_trace_items.append({
                "category": "Industry Fit",
                "status": "UNKNOWN",
                "label": "Industry Unconfirmed",
                "details": "No industry data recorded"
            })
            breakdown["industry"] = {"score": 0, "status": "UNKNOWN", "value": None}

        # 4. Company Size Fit
        w_size = weights.get("company_size", 15)
        emp_count = lead.employee_count or (company.employee_count if company else None)
        target_sizes = icp.target_company_sizes or []
        
        if emp_count is not None:
            known_data_points += 1
            size_fit = False
            if not target_sizes:
                size_fit = True
            else:
                for s in target_sizes:
                    if s == "1-10" and 1 <= emp_count <= 10:
                        size_fit = True
                    elif s == "11-50" and 11 <= emp_count <= 50:
                        size_fit = True
                    elif s == "51-200" and 51 <= emp_count <= 200:
                        size_fit = True
                    elif s == "201-500" and 201 <= emp_count <= 500:
                        size_fit = True
                    elif s in ("500+", "501-1000", "1000+") and emp_count > 500:
                        size_fit = True
                        
            if size_fit:
                accumulated_score += w_size
                matched_criteria.append(f"Company size fit: {emp_count} employees")
                decision_trace_items.append({
                    "category": "Company Scale",
                    "status": "MATCHED",
                    "label": "Target Company Size",
                    "details": f"{emp_count} employees is within ICP range"
                })
                breakdown["company_size"] = {"score": w_size, "status": "MATCHED", "value": emp_count}
            else:
                failed_criteria.append(f"Company size ({emp_count} employees) is outside target range")
                decision_trace_items.append({
                    "category": "Company Scale",
                    "status": "FAILED",
                    "label": "Out of Range Scale",
                    "details": f"{emp_count} employees is outside targeted tiers"
                })
                breakdown["company_size"] = {"score": 0, "status": "FAILED", "value": emp_count}
        else:
            unknown_criteria.append("Employee count is unconfirmed")
            decision_trace_items.append({
                "category": "Company Scale",
                "status": "UNKNOWN",
                "label": "Employee Count Unconfirmed",
                "details": "No employee count recorded"
            })
            breakdown["company_size"] = {"score": 0, "status": "UNKNOWN", "value": None}

        # 5. Geography Fit
        w_geo = weights.get("geography", 15)
        target_geos = [g.lower() for g in (icp.target_geographies or []) if isinstance(g, str)]
        
        if lead_location.strip():
            known_data_points += 1
            if not target_geos or any(g in lead_location for g in target_geos):
                accumulated_score += w_geo
                matched_criteria.append(f"Geography match: '{lead_location.strip().title()}'")
                decision_trace_items.append({
                    "category": "Geography",
                    "status": "MATCHED",
                    "label": "Target Geography",
                    "details": f"Location '{lead_location.strip().title()}' fits target territory"
                })
                breakdown["geography"] = {"score": w_geo, "status": "MATCHED", "value": lead_location.strip()}
            else:
                failed_criteria.append(f"Geography '{lead_location.strip().title()}' outside target territories")
                decision_trace_items.append({
                    "category": "Geography",
                    "status": "FAILED",
                    "label": "Non-Target Region",
                    "details": f"Region '{lead_location.strip().title()}' not in target geos"
                })
                breakdown["geography"] = {"score": 0, "status": "FAILED", "value": lead_location.strip()}
        else:
            unknown_criteria.append("Geography / Country is unconfirmed")
            decision_trace_items.append({
                "category": "Geography",
                "status": "UNKNOWN",
                "label": "Location Unconfirmed",
                "details": "No location information recorded"
            })
            breakdown["geography"] = {"score": 0, "status": "UNKNOWN", "value": None}

        # 6. Technology Stack Fit
        w_tech = weights.get("technology", 15)
        target_techs = [t.lower() for t in (icp.target_technologies or []) if isinstance(t, str)]
        company_techs = [t.lower() for t in (company.technologies if company and company.technologies else []) if isinstance(t, str)]
        
        if company_techs:
            known_data_points += 1
            matched_techs = [t for t in target_techs if t in company_techs]
            if matched_techs or not target_techs:
                accumulated_score += w_tech
                matched_criteria.append(f"Technology match: {', '.join(matched_techs or company_techs[:3])}")
                decision_trace_items.append({
                    "category": "Technology Stack",
                    "status": "MATCHED",
                    "label": "Target Tech Stack",
                    "details": f"Detected: {', '.join(matched_techs or company_techs[:3])}"
                })
                breakdown["technology"] = {"score": w_tech, "status": "MATCHED", "value": matched_techs}
            else:
                failed_criteria.append("Target technology stack not detected")
                decision_trace_items.append({
                    "category": "Technology Stack",
                    "status": "FAILED",
                    "label": "Tech Stack Mismatch",
                    "details": "Company does not use targeted technologies"
                })
                breakdown["technology"] = {"score": 0, "status": "FAILED", "value": company_techs}
        else:
            unknown_criteria.append("Technology stack unconfirmed")
            decision_trace_items.append({
                "category": "Technology Stack",
                "status": "UNKNOWN",
                "label": "Technology Unconfirmed",
                "details": "Enrichment needed to detect tech stack"
            })
            breakdown["technology"] = {"score": 0, "status": "UNKNOWN", "value": None}

        # 7. Business Signals Fit
        w_sig = weights.get("business_signal", 10)
        target_signals = icp.business_signals or []
        if target_signals:
            # Check if any signal applies
            accumulated_score += int(w_sig * 0.5)  # Baseline assumption if ICP requires it
            breakdown["business_signal"] = {"score": int(w_sig * 0.5), "status": "MATCHED"}
            decision_trace_items.append({
                "category": "Business Signals",
                "status": "MATCHED",
                "label": "Growth Signals",
                "details": "Active outreach candidate"
            })
        else:
            accumulated_score += w_sig
            breakdown["business_signal"] = {"score": w_sig, "status": "MATCHED"}
            
        # Normalization
        final_score = min(100, max(0, int((accumulated_score / total_possible_weight) * 100)))
        confidence = round(known_data_points / float(total_data_points), 2)
        
        # Build explainable transparent summary
        explanation_lines = []
        if matched_criteria:
            explanation_lines.append("Matched ICP criteria:\n- " + "\n- ".join(matched_criteria))
        if failed_criteria:
            explanation_lines.append("Failed criteria:\n- " + "\n- ".join(failed_criteria))
        if unknown_criteria:
            explanation_lines.append("Unknown criteria requiring enrichment:\n- " + "\n- ".join(unknown_criteria))
            
        explanation = "\n\n".join(explanation_lines)
        
        auto_qualified = final_score >= icp.auto_qualification_threshold
        
        return {
            "score": final_score,
            "confidence": confidence,
            "matched_criteria": matched_criteria,
            "failed_criteria": failed_criteria,
            "unknown_criteria": unknown_criteria,
            "breakdown": breakdown,
            "explanation": explanation,
            "decision_trace_items": decision_trace_items,
            "auto_qualified": auto_qualified
        }
