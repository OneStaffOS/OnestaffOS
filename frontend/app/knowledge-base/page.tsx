"use client";

import { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import styles from './knowledge-base.module.css';
import knowledgeData from './knowledge-data.json';

interface Article {
  id: string;
  title: string;
  tags: string[];
  question: string;
  answer: string;
  relatedArticles?: string[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  articles: Article[];
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const categories: Category[] = knowledgeData.categories;

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const results: { article: Article; category: Category; score: number }[] = [];

    categories.forEach((category) => {
      category.articles.forEach((article) => {
        let score = 0;

        // Check title match
        if (article.title.toLowerCase().includes(query)) {
          score += 10;
        }

        // Check question match
        if (article.question.toLowerCase().includes(query)) {
          score += 8;
        }

        // Check tags match
        article.tags.forEach((tag) => {
          if (tag.toLowerCase().includes(query) || query.includes(tag.toLowerCase())) {
            score += 5;
          }
        });

        // Check answer match
        if (article.answer.toLowerCase().includes(query)) {
          score += 3;
        }

        if (score > 0) {
          results.push({ article, category, score });
        }
      });
    });

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }, [searchQuery, categories]);

  // Get articles for selected category
  const categoryArticles = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find((c) => c.id === selectedCategory);
  }, [selectedCategory, categories]);

  // Find related articles
  const getRelatedArticles = (articleIds: string[]): { article: Article; category: Category }[] => {
    const related: { article: Article; category: Category }[] = [];
    articleIds.forEach((id) => {
      categories.forEach((category) => {
        const article = category.articles.find((a) => a.id === id);
        if (article) {
          related.push({ article, category });
        }
      });
    });
    return related;
  };

  const toggleArticleExpand = (articleId: string) => {
    const newExpanded = new Set(expandedArticles);
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId);
    } else {
      newExpanded.add(articleId);
    }
    setExpandedArticles(newExpanded);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedArticle(null);
    setSearchQuery('');
  };

  const handleBackToCategory = () => {
    setSelectedArticle(null);
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown renderer for bold and lists
    return text.split('\n').map((line, index) => {
      // Handle bold text
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Handle bullet points
      if (line.trim().startsWith('- ')) {
        return (
          <li key={index} className={styles.bulletPoint} dangerouslySetInnerHTML={{ __html: processedLine.substring(2) }} />
        );
      }
      
      // Handle numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s/);
      if (numberedMatch) {
        return (
          <li key={index} className={styles.numberedPoint} dangerouslySetInnerHTML={{ __html: processedLine.substring(numberedMatch[0].length) }} />
        );
      }

      // Handle headers
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        return (
          <h4 key={index} className={styles.sectionHeader} dangerouslySetInnerHTML={{ __html: processedLine }} />
        );
      }

      // Handle table rows (simplified)
      if (line.includes('|')) {
        return null; // Skip table formatting for now
      }

      // Regular paragraph
      if (line.trim()) {
        return (
          <p key={index} className={styles.paragraph} dangerouslySetInnerHTML={{ __html: processedLine }} />
        );
      }

      return <br key={index} />;
    });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout title="Knowledge Base" role="Support">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>📚 Knowledge Base</h1>
              <p className={styles.subtitle}>
                Find answers to common questions and solutions to frequent issues
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search for solutions... (e.g., 'password reset', 'VPN', 'printer')"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCategory(null);
                  setSelectedArticle(null);
                }}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {(selectedCategory || selectedArticle) && !searchQuery && (
            <div className={styles.breadcrumb}>
              <button onClick={handleBackToCategories} className={styles.breadcrumbLink}>
                Knowledge Base
              </button>
              {selectedCategory && (
                <>
                  <span className={styles.breadcrumbSeparator}>›</span>
                  <button
                    onClick={handleBackToCategory}
                    className={selectedArticle ? styles.breadcrumbLink : styles.breadcrumbCurrent}
                  >
                    {categories.find((c) => c.id === selectedCategory)?.name}
                  </button>
                </>
              )}
              {selectedArticle && (
                <>
                  <span className={styles.breadcrumbSeparator}>›</span>
                  <span className={styles.breadcrumbCurrent}>{selectedArticle.title}</span>
                </>
              )}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && searchResults && (
            <div className={styles.searchResults}>
              <h2 className={styles.resultsHeader}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
              </h2>
              {searchResults.length === 0 ? (
                <div className={styles.noResults}>
                  <span className={styles.noResultsIcon}>🔍</span>
                  <h3>No results found</h3>
                  <p>Try different keywords or browse categories below</p>
                </div>
              ) : (
                <div className={styles.resultsList}>
                  {searchResults.map(({ article, category }) => (
                    <div
                      key={article.id}
                      className={styles.resultCard}
                      onClick={() => {
                        setSelectedArticle(article);
                        setSelectedCategory(category.id);
                        setSearchQuery('');
                      }}
                    >
                      <div className={styles.resultCategory}>
                        <span>{category.icon}</span> {category.name}
                      </div>
                      <h3 className={styles.resultTitle}>{article.title}</h3>
                      <p className={styles.resultQuestion}>{article.question}</p>
                      <div className={styles.resultTags}>
                        {article.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Article Detail View */}
          {selectedArticle && !searchQuery && (
            <div className={styles.articleView}>
              <div className={styles.articleHeader}>
                <div className={styles.articleCategory}>
                  <span>{categories.find((c) => c.id === selectedCategory)?.icon}</span>
                  {categories.find((c) => c.id === selectedCategory)?.name}
                </div>
                <h2 className={styles.articleTitle}>{selectedArticle.title}</h2>
                <p className={styles.articleQuestion}>{selectedArticle.question}</p>
                <div className={styles.articleTags}>
                  {selectedArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className={styles.tag}
                      onClick={() => setSearchQuery(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.articleContent}>
                <div className={styles.answerSection}>
                  {renderMarkdown(selectedArticle.answer)}
                </div>
              </div>

              {/* Related Articles */}
              {selectedArticle.relatedArticles && selectedArticle.relatedArticles.length > 0 && (
                <div className={styles.relatedSection}>
                  <h3 className={styles.relatedTitle}>📎 Related Articles</h3>
                  <div className={styles.relatedList}>
                    {getRelatedArticles(selectedArticle.relatedArticles).map(({ article, category }) => (
                      <button
                        key={article.id}
                        className={styles.relatedCard}
                        onClick={() => {
                          setSelectedArticle(article);
                          setSelectedCategory(category.id);
                        }}
                      >
                        <span className={styles.relatedIcon}>{category.icon}</span>
                        <span className={styles.relatedText}>{article.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Helpful Feedback */}
              <div className={styles.feedbackSection}>
                <p>Was this article helpful?</p>
                <div className={styles.feedbackButtons}>
                  <button className={styles.feedbackYes}>👍 Yes</button>
                  <button className={styles.feedbackNo}>👎 No</button>
                </div>
              </div>
            </div>
          )}

          {/* Category View */}
          {selectedCategory && !selectedArticle && !searchQuery && categoryArticles && (
            <div className={styles.categoryView}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>{categoryArticles.icon}</span>
                <div>
                  <h2 className={styles.categoryTitle}>{categoryArticles.name}</h2>
                  <p className={styles.categoryDescription}>{categoryArticles.description}</p>
                </div>
              </div>

              <div className={styles.articlesList}>
                {categoryArticles.articles.map((article) => (
                  <div key={article.id} className={styles.articleCard}>
                    <div
                      className={styles.articleCardHeader}
                      onClick={() => toggleArticleExpand(article.id)}
                    >
                      <h3 className={styles.articleCardTitle}>{article.title}</h3>
                      <span className={styles.expandIcon}>
                        {expandedArticles.has(article.id) ? '−' : '+'}
                      </span>
                    </div>
                    <p className={styles.articleCardQuestion}>{article.question}</p>
                    
                    {expandedArticles.has(article.id) && (
                      <div className={styles.articlePreview}>
                        <div className={styles.previewContent}>
                          {renderMarkdown(article.answer.slice(0, 500) + (article.answer.length > 500 ? '...' : ''))}
                        </div>
                        <button
                          className={styles.readMoreBtn}
                          onClick={() => setSelectedArticle(article)}
                        >
                          Read Full Article →
                        </button>
                      </div>
                    )}
                    
                    <div className={styles.articleCardTags}>
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.tagSmall}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories Grid (Home View) */}
          {!selectedCategory && !searchQuery && (
            <div className={styles.categoriesSection}>
              <h2 className={styles.sectionTitle}>Browse by Category</h2>
              <div className={styles.categoriesGrid}>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={styles.categoryCard}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className={styles.cardIcon}>{category.icon}</div>
                    <h3 className={styles.cardTitle}>{category.name}</h3>
                    <p className={styles.cardDescription}>{category.description}</p>
                    <span className={styles.cardCount}>
                      {category.articles.length} article{category.articles.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Popular Articles */}
              <div className={styles.popularSection}>
                <h2 className={styles.sectionTitle}>🔥 Most Viewed Articles</h2>
                <div className={styles.popularGrid}>
                  {[
                    categories[0].articles[0], // Application Not Responding
                    categories[3].articles[0], // Forgot Password
                    categories[2].articles[0], // No Internet Connection
                    categories[2].articles[2], // VPN Connection Problems
                    categories[1].articles[1], // Slow Computer Performance
                    categories[4].articles[0], // Time Clock Issues
                  ].map((article) => {
                    const category = categories.find((c) =>
                      c.articles.some((a) => a.id === article.id)
                    );
                    return (
                      <div
                        key={article.id}
                        className={styles.popularCard}
                        onClick={() => {
                          setSelectedArticle(article);
                          setSelectedCategory(category?.id || null);
                        }}
                      >
                        <span className={styles.popularIcon}>{category?.icon}</span>
                        <span className={styles.popularTitle}>{article.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Help Section */}
              <div className={styles.quickHelpSection}>
                <h2 className={styles.sectionTitle}>💡 Quick Tips</h2>
                <div className={styles.quickHelpGrid}>
                  <div className={styles.quickHelpCard}>
                    <h4>🔑 Password Issues?</h4>
                    <p>Use the "Forgot Password" link on the login page. Check your spam folder for the reset email.</p>
                  </div>
                  <div className={styles.quickHelpCard}>
                    <h4>🖥️ Computer Slow?</h4>
                    <p>Try restarting first! Close unused programs and check if disk space is running low.</p>
                  </div>
                  <div className={styles.quickHelpCard}>
                    <h4>🌐 No Internet?</h4>
                    <p>Check if others are affected. Try forgetting and reconnecting to WiFi. Restart your device.</p>
                  </div>
                  <div className={styles.quickHelpCard}>
                    <h4>📝 Need More Help?</h4>
                    <p>Submit a support ticket with detailed information for personalized assistance.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Still Need Help Banner */}
          <div className={styles.helpBanner}>
            <div className={styles.helpBannerContent}>
              <h3>Still can't find what you're looking for?</h3>
              <p>Our support team is here to help you</p>
            </div>
            <a href="/support" className={styles.helpBannerBtn}>
              Submit a Ticket
            </a>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}