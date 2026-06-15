from .schemas import PromoGenerationRequest, PromoGenerationResult

__all__ = ["PromoGenerationRequest", "PromoGenerationResult", "generate_promo"]


def generate_promo(request: PromoGenerationRequest) -> PromoGenerationResult:
    from .promo_generator import generate_promo as run_generation

    return run_generation(request)
