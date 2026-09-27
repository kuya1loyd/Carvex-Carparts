import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Plus, Trash2, Search, CheckCircle2 } from 'lucide-react';
import productService from '../../services/productService';
import PageSkeleton from '../../components/Skeleton';

const STORAGE_KEY = 'customer_garage_v1';

const readGarage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const saveGarage = (cars) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
    } catch {
        // ignore storage errors
    }
};

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const toTokens = (value) => normalize(value).split(/\s+/).filter(Boolean);

const MAKE_ALIASES = {
    mitsubishi: ['mitsubishi', 'mitsu'],
    toyota: ['toyota'],
    honda: ['honda'],
    nissan: ['nissan'],
    mazda: ['mazda'],
    ford: ['ford'],
};

const MODEL_ALIASES = {
    'lancer cedia': ['lancer cedia', 'lancer', 'cedia'],
    lancer: ['lancer', 'lancer cedia', 'lancer ex'],
    vios: ['vios', 'yaris sedan'],
    civic: ['civic'],
    corolla: ['corolla', 'altis'],
};

const expandAliases = (rawValue, aliasesMap) => {
    const base = normalize(rawValue);
    if (!base) return [];

    const exact = aliasesMap[base] || [];
    const collected = new Set([base, ...exact]);

    Object.entries(aliasesMap).forEach(([key, values]) => {
        if (values.includes(base)) {
            collected.add(key);
            values.forEach((item) => collected.add(item));
        }
    });

    return Array.from(collected).map(normalize).filter(Boolean);
};

const extractYearData = (text) => {
    const normalizedText = String(text || '');
    const ranges = [];
    const singles = [];

    const rangeRegex = /((?:19|20)\d{2})\s*[-/]\s*((?:19|20)\d{2})/g;
    let rangeMatch;
    while ((rangeMatch = rangeRegex.exec(normalizedText)) !== null) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        if (Number.isFinite(start) && Number.isFinite(end)) {
            ranges.push([Math.min(start, end), Math.max(start, end)]);
        }
    }

    const yearRegex = /(?:19|20)\d{2}/g;
    let yearMatch;
    while ((yearMatch = yearRegex.exec(normalizedText)) !== null) {
        const year = Number(yearMatch[0]);
        if (Number.isFinite(year)) {
            singles.push(year);
        }
    }

    return { ranges, singles };
};

const yearMatches = (carYear, compatibilityText) => {
    const year = Number(String(carYear || '').match(/(?:19|20)\d{2}/)?.[0] || 0);
    if (!Number.isFinite(year) || year <= 0) {
        return true;
    }

    const { ranges, singles } = extractYearData(compatibilityText);
    if (ranges.length === 0 && singles.length === 0) {
        return true;
    }

    if (ranges.some(([start, end]) => year >= start && year <= end)) {
        return true;
    }

    return singles.includes(year);
};

const matchesVehicle = (product, car) => {
    const compatibilityText = String(product?.vehicle_compatibility || '');
    const haystack = normalize(compatibilityText);
    if (!haystack) {
        return false;
    }

    const makeTerms = expandAliases(car.make, MAKE_ALIASES);
    const modelTerms = expandAliases(car.model, MODEL_ALIASES);
    const yearOk = yearMatches(car.year, compatibilityText);

    const makeMatched = makeTerms.some((term) => haystack.includes(term));
    const modelMatched = modelTerms.some((term) => haystack.includes(term));

    if (makeMatched && modelMatched) {
        return yearOk;
    }

    const carPhrase = normalize(`${car.make} ${car.model}`);
    if (carPhrase && haystack.includes(carPhrase) && yearOk) {
        return true;
    }

    const haystackTokens = new Set(toTokens(haystack));
    const modelTokens = Array.from(new Set(modelTerms.flatMap((term) => toTokens(term)).filter((token) => token.length > 2)));
    const matchedModelTokens = modelTokens.filter((token) => haystackTokens.has(token));

    return yearOk && makeMatched && matchedModelTokens.length > 0;
};

export default function DashboardGarage() {
    const [garage, setGarage] = useState(() => readGarage());
    const [activeCarId, setActiveCarId] = useState(() => readGarage()[0]?.id || '');
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [form, setForm] = useState({ make: '', model: '', year: '', notes: '', image: '' });

    const fieldStyle = {
        height: 42,
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: '0 12px',
        background: '#ffffff',
        color: '#0f172a',
        caretColor: '#0f172a',
        fontSize: 14,
        WebkitTextFillColor: '#0f172a',
    };

    const textareaStyle = {
        minHeight: 86,
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: '10px 12px',
        background: '#ffffff',
        color: '#0f172a',
        caretColor: '#0f172a',
        fontSize: 14,
        resize: 'vertical',
        WebkitTextFillColor: '#0f172a',
    };

    useEffect(() => {
        if (!activeCarId && garage[0]?.id) {
            setActiveCarId(garage[0].id);
        }
        saveGarage(garage);
    }, [garage, activeCarId]);

    useEffect(() => {
        let mounted = true;

        const loadProducts = async () => {
            try {
                const response = await productService.getAll({ per_page: 1000 });
                const rows = response?.data?.data?.data || response?.data?.data?.products || response?.data?.data || [];
                if (mounted) {
                    setProducts(Array.isArray(rows) ? rows : []);
                }
            } catch (error) {
                if (mounted) {
                    setProducts([]);
                }
            } finally {
                if (mounted) {
                    setLoadingProducts(false);
                }
            }
        };

        loadProducts();
        return () => {
            mounted = false;
        };
    }, []);

    const activeCar = garage.find((car) => String(car.id) === String(activeCarId)) || garage[0] || null;

    const compatibleProducts = useMemo(() => {
        if (!activeCar) return [];

        return products.filter((product) => matchesVehicle(product, activeCar));
    }, [products, activeCar]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddCar = async (event) => {
        event.preventDefault();
        const make = form.make.trim();
        const model = form.model.trim();
        const year = form.year.trim();

        if (!make || !model || !year) {
            setMessage('Please enter make, model, and year.');
            return;
        }

        setLoading(true);
        setMessage('');

        const newCar = {
            id: `${Date.now()}`,
            make,
            model,
            year,
            notes: form.notes.trim(),
            image: form.image || '',
        };

        setGarage((previous) => [newCar, ...previous]);
        setActiveCarId(newCar.id);
        setForm({ make: '', model: '', year: '', notes: '', image: '' });
        setMessage('Car saved to your garage.');
        setLoading(false);
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setMessage('Please upload an image file.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage('Image is too large. Please use an image under 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            setForm((previous) => ({ ...previous, image: result }));
            setMessage('Car photo added.');
        };
        reader.onerror = () => {
            setMessage('Failed to read image file. Please try another photo.');
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteCar = (id) => {
        const target = garage.find((car) => String(car.id) === String(id));
        const label = target ? `${target.year} ${target.make} ${target.model}` : 'this car';
        const confirmed = window.confirm(`Delete ${label} from your garage?`);
        if (!confirmed) {
            return;
        }

        setGarage((previous) => previous.filter((car) => String(car.id) !== String(id)));
        if (String(activeCarId) === String(id)) {
            setActiveCarId('');
        }
        setMessage('Car deleted successfully.');
    };

    return (
        <section style={{ background: '#ffffff', border: '1px solid #dbe1ea', borderRadius: 14, padding: '1.2rem 1.25rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)', color: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em' }}>My Garage</h2>
                    <p style={{ margin: '0.4rem 0 0', color: '#64748b', fontSize: 14 }}>Save your car here and see the products that match it.</p>
                </div>
                <Link to="/dashboard/products" style={{ textDecoration: 'none', background: '#fff7ed', color: '#f97316', border: '1px solid #fdba74', borderRadius: 10, padding: '10px 14px', fontWeight: 800 }}>
                    Browse All Products
                </Link>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Add a Car</h3>
                    <form onSubmit={handleAddCar} style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                        <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Make</span>
                            <input name="make" value={form.make} onChange={handleChange} placeholder="Toyota" style={fieldStyle} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Model</span>
                            <input name="model" value={form.model} onChange={handleChange} placeholder="Vios" style={fieldStyle} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Year</span>
                            <input name="year" value={form.year} onChange={handleChange} placeholder="2022" style={fieldStyle} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Notes</span>
                            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes about your car" style={textareaStyle} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Car Photo</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', background: '#ffffff', color: '#0f172a' }}
                            />
                        </label>
                        {form.image && (
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#ffffff', padding: 8 }}>
                                <img src={form.image} alt="Car preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
                            </div>
                        )}
                        <button type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 0, borderRadius: 10, background: '#f97316', color: '#ffffff', fontWeight: 800, padding: '10px 14px', cursor: 'pointer' }}>
                            <Plus size={16} />
                            Save Car
                        </button>
                    </form>
                    {message && <p style={{ margin: '10px 0 0', color: message.toLowerCase().includes('saved') ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{message}</p>}
                </div>

                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Saved Cars</h3>
                    {garage.length === 0 ? (
                        <p style={{ margin: '12px 0 0', color: '#64748b' }}>No cars saved yet. Add your first car to start matching products.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                            {garage.map((car) => {
                                const isActive = car.id === activeCarId;
                                return (
                                    <button
                                        key={car.id}
                                        type="button"
                                        onClick={() => setActiveCarId(car.id)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            border: isActive ? '1px solid #fb923c' : '1px solid #e2e8f0',
                                            borderRadius: 12,
                                            background: isActive ? '#fff7ed' : '#f8fafc',
                                            padding: '12px 14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                            color: '#0f172a',
                                        }}
                                    >
                                        <div>
                                            <strong style={{ display: 'block', fontSize: 16 }}>{car.year} {car.make} {car.model}</strong>
                                            {car.notes && <span style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: 13 }}>{car.notes}</span>}
                                        </div>
                                        {car.image && (
                                            <img src={car.image} alt={`${car.make} ${car.model}`} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                        )}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: isActive ? '#f97316' : '#64748b', fontWeight: 800 }}>
                                            {isActive ? <CheckCircle2 size={16} /> : <Car size={16} />}
                                            {isActive ? 'Active' : 'Use'}
                                        </span>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleDeleteCar(car.id);
                                            }}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    handleDeleteCar(car.id);
                                                }
                                            }}
                                            style={{ color: '#b91c1c', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
                                        >
                                            <Trash2 size={16} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Products for your car</h3>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                            {activeCar ? `Showing parts compatible with ${activeCar.year} ${activeCar.make} ${activeCar.model}` : 'Save a car to see matching parts.'}
                        </p>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748b', fontWeight: 700 }}>
                        <Search size={16} />
                        <span>{compatibleProducts.length} matches</span>
                    </div>
                </div>

                <div style={{ marginTop: 14 }}>
                    {loadingProducts ? (
                        <PageSkeleton variant="cards" label="Loading compatible products" />
                    ) : !activeCar ? (
                        <div style={{ padding: 18, borderRadius: 12, background: '#f8fafc', color: '#64748b' }}>Add your car first.</div>
                    ) : compatibleProducts.length === 0 ? (
                        <div style={{ padding: 18, borderRadius: 12, background: '#f8fafc', color: '#64748b' }}>
                            No matching products were found for this car yet.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                            {compatibleProducts.slice(0, 12).map((product) => (
                                <article key={product.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                                    <strong style={{ display: 'block', color: '#0f172a', fontSize: 15 }}>{product.name}</strong>
                                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>{product.brand}</p>
                                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>{product.vehicle_compatibility || 'Compatible vehicle info not set'}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
